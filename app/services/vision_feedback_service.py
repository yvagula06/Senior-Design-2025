"""
Vision Feedback Service

Service for storing camera pipeline estimates, collecting user feedback,
and maintaining per-user personalisation profiles.

Schema: BIGSERIAL PKs throughout. user_id is a BIGINT FK to the users table;
callers pass a device_id string which is resolved (get_or_create) on first use.
"""

from typing import Optional
from datetime import datetime
import json

from sqlalchemy import text

from app.db.session import engine, get_or_create_user_id
from app.schemas.vision import (
    VisionFeedbackRequest,
    VisionFeedbackResponse,
    PersonalizationProfile,
)

import logging

logger = logging.getLogger(__name__)


class VisionFeedbackService:
    """Service for managing vision estimation feedback."""

    @staticmethod
    def store_estimate(
        device_id: Optional[str],
        capture_mode: str,
        num_images: int,
        device_type: Optional[str],
        has_depth_data: bool,
        predicted_dish_name: str,
        predicted_confidence: Optional[float],
        calorie_estimate: float,
        calorie_range_min: Optional[float],
        calorie_range_max: Optional[float],
        volume_ml: Optional[float],
        volume_confidence: Optional[float],
        alternative_dishes: Optional[list],
        estimation_mode: str,
        processing_time_ms: Optional[int],
        image_storage_keys: Optional[list] = None,
        depth_storage_key: Optional[str] = None,
        classifier_version: Optional[str] = None,
        segmentation_version: Optional[str] = None,
        volume_estimator_version: Optional[str] = None,
        predicted_dish_id: Optional[int] = None,
    ) -> int:
        """
        Persist a vision estimate and return its auto-generated BIGSERIAL id.

        Args:
            device_id: Mobile device UUID (resolved to users.id; creates user if new).
            image_storage_keys: List of storage path/key strings â€” NOT base64.
        """
        with engine.connect() as conn:
            user_id: Optional[int] = None
            if device_id:
                user_id = get_or_create_user_id(device_id, conn)

            result = conn.execute(
                text("""
                    INSERT INTO vision_estimates (
                        user_id, capture_mode, num_images, device_type, has_depth_data,
                        image_storage_keys, depth_storage_key,
                        predicted_dish_id, predicted_dish_name, predicted_confidence,
                        calorie_estimate, calorie_range_min, calorie_range_max,
                        volume_ml, volume_confidence, alternative_dishes,
                        estimation_mode, classifier_version, segmentation_version,
                        volume_estimator_version, processing_time_ms, created_at
                    ) VALUES (
                        :user_id, :capture_mode, :num_images, :device_type, :has_depth_data,
                        :image_storage_keys::jsonb, :depth_storage_key,
                        :predicted_dish_id, :predicted_dish_name, :predicted_confidence,
                        :calorie_estimate, :calorie_range_min, :calorie_range_max,
                        :volume_ml, :volume_confidence, :alternative_dishes::jsonb,
                        :estimation_mode, :classifier_version, :segmentation_version,
                        :volume_estimator_version, :processing_time_ms, :created_at
                    )
                    RETURNING id
                """),
                {
                    "user_id": user_id,
                    "capture_mode": capture_mode,
                    "num_images": num_images,
                    "device_type": device_type,
                    "has_depth_data": has_depth_data,
                    "image_storage_keys": json.dumps(image_storage_keys) if image_storage_keys else None,
                    "depth_storage_key": depth_storage_key,
                    "predicted_dish_id": predicted_dish_id,
                    "predicted_dish_name": predicted_dish_name,
                    "predicted_confidence": predicted_confidence,
                    "calorie_estimate": calorie_estimate,
                    "calorie_range_min": calorie_range_min,
                    "calorie_range_max": calorie_range_max,
                    "volume_ml": volume_ml,
                    "volume_confidence": volume_confidence,
                    "alternative_dishes": json.dumps(alternative_dishes) if alternative_dishes else None,
                    "estimation_mode": estimation_mode,
                    "classifier_version": classifier_version,
                    "segmentation_version": segmentation_version,
                    "volume_estimator_version": volume_estimator_version,
                    "processing_time_ms": processing_time_ms,
                    "created_at": datetime.utcnow(),
                },
            )
            estimate_id: int = result.fetchone()[0]
            conn.commit()

        logger.info(f"Stored vision estimate id={estimate_id} dish='{predicted_dish_name}'")
        return estimate_id

    @staticmethod
    def submit_feedback(
        feedback_request: VisionFeedbackRequest,
    ) -> VisionFeedbackResponse:
        """
        Store user feedback on a vision estimate and update personalisation.

        Returns:
            VisionFeedbackResponse with confirmation and personalisation updates.
        """
        with engine.connect() as conn:
            # Resolve device_id â†’ users.id (nullable)
            user_id: Optional[int] = None
            if feedback_request.user_id:
                user_id = get_or_create_user_id(feedback_request.user_id, conn)

            result = conn.execute(
                text("""
                    INSERT INTO vision_feedback (
                        vision_estimate_id, user_id, feedback_type,
                        confirmed_dish_name, portion_adjustment, plate_size,
                        quick_feedback, corrected_calories, notes, created_at
                    ) VALUES (
                        :vision_estimate_id, :user_id, :feedback_type,
                        :confirmed_dish_name, :portion_adjustment, :plate_size,
                        :quick_feedback, :corrected_calories, :notes, :created_at
                    )
                    RETURNING id
                """),
                {
                    "vision_estimate_id": (
                        int(feedback_request.estimate_id)
                        if feedback_request.estimate_id else None
                    ),
                    "user_id": user_id,
                    "feedback_type": feedback_request.feedback_type.value,
                    "confirmed_dish_name": feedback_request.confirmed_dish,
                    "portion_adjustment": feedback_request.portion_adjustment,
                    "plate_size": feedback_request.plate_size.value if feedback_request.plate_size else None,
                    "quick_feedback": feedback_request.quick_feedback.value if feedback_request.quick_feedback else None,
                    "corrected_calories": feedback_request.corrected_calories,
                    "notes": feedback_request.notes,
                    "created_at": feedback_request.timestamp or datetime.utcnow(),
                },
            )
            feedback_id = str(result.fetchone()[0])
            conn.commit()

        logger.info(
            f"Recorded feedback id={feedback_id} estimate_id={feedback_request.estimate_id} "
            f"type={feedback_request.feedback_type.value}"
        )

        # Update personalisation if we have both user and a portion adjustment
        personalization_updated = False
        new_portion_factor = None

        if user_id and feedback_request.portion_adjustment:
            try:
                new_portion_factor = VisionFeedbackService._update_personalization(
                    user_id,
                    feedback_request.portion_adjustment,
                )
                personalization_updated = True
            except Exception as exc:
                logger.error(f"Failed to update personalization: {exc}")

        return VisionFeedbackResponse(
            success=True,
            feedback_id=feedback_id,
            message="Feedback recorded successfully. Thank you!",
            personalization_updated=personalization_updated,
            new_portion_factor=new_portion_factor,
        )

    @staticmethod
    def _update_personalization(user_id: int, portion_adjustment: float) -> float:
        """
        Upsert user_portion_preferences with incremental average.
        Uses ON CONFLICT so there is no separate SELECT before writing.

        Returns:
            Updated average portion factor.
        """
        # Compute confidence: sigmoid curve capped at 0.95
        def _confidence(count: int) -> float:
            return min(0.95, 1.0 - 1.0 / (1.0 + count / 10.0))

        with engine.connect() as conn:
            # Fetch current values (if any) to compute new average client-side.
            row = conn.execute(
                text("""
                    SELECT avg_portion_factor, feedback_count
                    FROM user_portion_preferences
                    WHERE user_id = :uid
                """),
                {"uid": user_id},
            ).fetchone()

            if row:
                old_avg, old_count = float(row[0]), int(row[1])
                new_count = old_count + 1
                new_avg = (old_avg * old_count + portion_adjustment) / new_count
            else:
                new_count = 1
                new_avg = portion_adjustment

            new_confidence = _confidence(new_count)

            conn.execute(
                text("""
                    INSERT INTO user_portion_preferences
                        (user_id, avg_portion_factor, feedback_count, confidence_score,
                         last_updated, created_at)
                    VALUES
                        (:uid, :avg, :cnt, :conf, now(), now())
                    ON CONFLICT (user_id) DO UPDATE SET
                        avg_portion_factor = :avg,
                        feedback_count     = :cnt,
                        confidence_score   = :conf,
                        last_updated       = now()
                """),
                {"uid": user_id, "avg": new_avg, "cnt": new_count, "conf": new_confidence},
            )
            conn.commit()

        return new_avg

    @staticmethod
    def get_personalization_profile(device_id: str) -> Optional[PersonalizationProfile]:
        """
        Return the personalisation profile for the given device_id, or None.
        """
        with engine.connect() as conn:
            row = conn.execute(
                text("""
                    SELECT
                        u.device_id,
                        upp.avg_portion_factor,
                        upp.feedback_count,
                        upp.confidence_score,
                        upp.dish_preferences,
                        upp.category_preferences,
                        upp.last_updated,
                        upp.created_at
                    FROM user_portion_preferences upp
                    JOIN users u ON u.id = upp.user_id
                    WHERE u.device_id = :did
                """),
                {"did": device_id},
            ).fetchone()

        if not row:
            return None

        return PersonalizationProfile(
            user_id=row[0],
            avg_portion_factor=row[1],
            feedback_count=row[2],
            confidence_score=row[3],
            dish_preferences=row[4],
            category_preferences=row[5],
            last_updated=row[6],
            created_at=row[7],
        )

    @staticmethod
    def apply_personalization(
        device_id: Optional[str],
        base_calories: float,
    ) -> tuple[float, float]:
        """
        Apply the user's personalisation factor to a base calorie estimate.

        Returns:
            (adjusted_calories, portion_factor)
        """
        if not device_id:
            return base_calories, 1.0

        profile = VisionFeedbackService.get_personalization_profile(device_id)
        if not profile or profile.confidence_score < 0.3:
            return base_calories, 1.0

        factor = float(profile.avg_portion_factor)
        return base_calories * factor, factor
