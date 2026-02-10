"""
Vision Feedback Service - Phase 3

Service for collecting and processing user feedback on vision estimates.
Enables data-driven improvements and personalization.
"""

from typing import Optional, Dict, Any
from datetime import datetime
from uuid import uuid4
import json

from sqlalchemy import text

from app.db.session import engine
from app.schemas.vision import (
    VisionFeedbackRequest,
    VisionFeedbackResponse,
    FeedbackType,
    QuickFeedback,
    PersonalizationProfile,
)

import logging

logger = logging.getLogger(__name__)


class VisionFeedbackService:
    """Service for managing vision estimation feedback."""
    
    @staticmethod
    def store_estimate(
        user_id: Optional[str],
        capture_mode: str,
        num_images: int,
        device_type: Optional[str],
        has_depth_data: bool,
        predicted_dish: str,
        predicted_confidence: float,
        calorie_estimate: float,
        calorie_range_min: Optional[float],
        calorie_range_max: Optional[float],
        volume_ml: Optional[float],
        volume_confidence: Optional[float],
        alternative_dishes: Optional[list],
        estimation_mode: str,
        processing_time_ms: Optional[int],
        session_id: Optional[str] = None,
    ) -> str:
        """
        Store a vision estimate for future feedback tracking.
        
        Returns:
            estimate_id: UUID of the stored estimate
        """
        estimate_id = str(uuid4())
        
        query = text("""
            INSERT INTO vision_estimates (
                estimate_id, user_id, session_id, capture_mode, num_images,
                device_type, has_depth_data, predicted_dish, predicted_confidence,
                calorie_estimate, calorie_range_min, calorie_range_max,
                volume_ml, volume_confidence, alternative_dishes,
                estimation_mode, processing_time_ms, created_at
            ) VALUES (
                :estimate_id, :user_id, :session_id, :capture_mode, :num_images,
                :device_type, :has_depth_data, :predicted_dish, :predicted_confidence,
                :calorie_estimate, :calorie_range_min, :calorie_range_max,
                :volume_ml, :volume_confidence, :alternative_dishes::jsonb,
                :estimation_mode, :processing_time_ms, :created_at
            )
        """)
        
        with engine.connect() as conn:
            conn.execute(
                query,
                {
                    "estimate_id": estimate_id,
                    "user_id": user_id,
                    "session_id": session_id,
                    "capture_mode": capture_mode,
                    "num_images": num_images,
                    "device_type": device_type,
                    "has_depth_data": has_depth_data,
                    "predicted_dish": predicted_dish,
                    "predicted_confidence": predicted_confidence,
                    "calorie_estimate": calorie_estimate,
                    "calorie_range_min": calorie_range_min,
                    "calorie_range_max": calorie_range_max,
                    "volume_ml": volume_ml,
                    "volume_confidence": volume_confidence,
                    "alternative_dishes": json.dumps(alternative_dishes) if alternative_dishes else None,
                    "estimation_mode": estimation_mode,
                    "processing_time_ms": processing_time_ms,
                    "created_at": datetime.utcnow(),
                }
            )
            conn.commit()
        
        logger.info(f"Stored vision estimate {estimate_id} for dish: {predicted_dish}")
        return estimate_id
    
    @staticmethod
    def submit_feedback(
        feedback_request: VisionFeedbackRequest
    ) -> VisionFeedbackResponse:
        """
        Submit user feedback on a vision estimate.
        
        This is the main Phase 3 entry point for collecting:
        - Dish confirmations/corrections
        - Portion adjustments
        - Quick feedback (thumbs up/down, too high/low)
        - Plate size information
        
        Returns:
            VisionFeedbackResponse with confirmation and personalization updates
        """
        feedback_id = str(uuid4())
        
        # Store feedback
        query = text("""
            INSERT INTO vision_feedback (
                feedback_id, estimate_id, user_id, feedback_type,
                confirmed_dish, portion_adjustment, plate_size,
                quick_feedback, corrected_calories, notes, created_at
            ) VALUES (
                :feedback_id, :estimate_id, :user_id, :feedback_type,
                :confirmed_dish, :portion_adjustment, :plate_size,
                :quick_feedback, :corrected_calories, :notes, :created_at
            )
        """)
        
        with engine.connect() as conn:
            conn.execute(
                query,
                {
                    "feedback_id": feedback_id,
                    "estimate_id": feedback_request.estimate_id,
                    "user_id": feedback_request.user_id,
                    "feedback_type": feedback_request.feedback_type.value,
                    "confirmed_dish": feedback_request.confirmed_dish,
                    "portion_adjustment": feedback_request.portion_adjustment,
                    "plate_size": feedback_request.plate_size.value if feedback_request.plate_size else None,
                    "quick_feedback": feedback_request.quick_feedback.value if feedback_request.quick_feedback else None,
                    "corrected_calories": feedback_request.corrected_calories,
                    "notes": feedback_request.notes,
                    "created_at": feedback_request.timestamp or datetime.utcnow(),
                }
            )
            conn.commit()
        
        logger.info(
            f"Recorded feedback {feedback_id} for estimate {feedback_request.estimate_id}: "
            f"type={feedback_request.feedback_type.value}"
        )
        
        # Update personalization if user_id is provided
        personalization_updated = False
        new_portion_factor = None
        
        if feedback_request.user_id and feedback_request.portion_adjustment:
            try:
                new_portion_factor = VisionFeedbackService._update_personalization(
                    feedback_request.user_id,
                    feedback_request.portion_adjustment,
                    feedback_request.confirmed_dish,
                )
                personalization_updated = True
                logger.info(
                    f"Updated personalization for user {feedback_request.user_id}: "
                    f"new_factor={new_portion_factor:.2f}"
                )
            except Exception as e:
                logger.error(f"Failed to update personalization: {e}")
                # Continue even if personalization update fails
        
        return VisionFeedbackResponse(
            success=True,
            feedback_id=feedback_id,
            message="Feedback recorded successfully. Thank you!",
            personalization_updated=personalization_updated,
            new_portion_factor=new_portion_factor,
        )
    
    @staticmethod
    def _update_personalization(
        user_id: str,
        portion_adjustment: float,
        dish_name: Optional[str],
    ) -> float:
        """
        Update user's personalization profile with new portion data.
        
        Uses incremental averaging to update avg_portion_factor:
        new_avg = (old_avg * count + new_value) / (count + 1)
        
        Returns:
            Updated average portion factor
        """
        with engine.connect() as conn:
            # Get or create user preferences
            query = text("""
                SELECT avg_portion_factor, feedback_count, confidence_score
                FROM user_portion_preferences
                WHERE user_id = :user_id
            """)
            result = conn.execute(query, {"user_id": user_id})
            row = result.fetchone()
            
            if row:
                # Update existing profile
                old_avg = row[0]
                old_count = row[1]
                
                new_count = old_count + 1
                new_avg = (old_avg * old_count + portion_adjustment) / new_count
                
                # Confidence grows with more data (sigmoid curve, caps at 0.95)
                new_confidence = min(0.95, 1.0 - (1.0 / (1.0 + (new_count / 10.0))))
                
                update_query = text("""
                    UPDATE user_portion_preferences
                    SET avg_portion_factor = :new_avg,
                        feedback_count = :new_count,
                        confidence_score = :new_confidence,
                        last_updated = :now
                    WHERE user_id = :user_id
                """)
                
                conn.execute(
                    update_query,
                    {
                        "user_id": user_id,
                        "new_avg": new_avg,
                        "new_count": new_count,
                        "new_confidence": new_confidence,
                        "now": datetime.utcnow(),
                    }
                )
            else:
                # Create new profile
                new_avg = portion_adjustment
                new_count = 1
                new_confidence = 0.10  # Low confidence with just one data point
                
                insert_query = text("""
                    INSERT INTO user_portion_preferences (
                        preference_id, user_id, avg_portion_factor,
                        feedback_count, confidence_score, created_at, last_updated
                    ) VALUES (
                        :preference_id, :user_id, :avg_portion_factor,
                        :feedback_count, :confidence_score, :created_at, :last_updated
                    )
                """)
                
                conn.execute(
                    insert_query,
                    {
                        "preference_id": str(uuid4()),
                        "user_id": user_id,
                        "avg_portion_factor": new_avg,
                        "feedback_count": new_count,
                        "confidence_score": new_confidence,
                        "created_at": datetime.utcnow(),
                        "last_updated": datetime.utcnow(),
                    }
                )
            
            conn.commit()
            return new_avg
    
    @staticmethod
    def get_personalization_profile(
        user_id: str
    ) -> Optional[PersonalizationProfile]:
        """
        Get user's personalization profile.
        
        Returns:
            PersonalizationProfile if exists, None otherwise
        """
        query = text("""
            SELECT user_id, avg_portion_factor, feedback_count, confidence_score,
                   dish_preferences, category_preferences, last_updated, created_at
            FROM user_portion_preferences
            WHERE user_id = :user_id
        """)
        
        with engine.connect() as conn:
            result = conn.execute(query, {"user_id": user_id})
            row = result.fetchone()
            
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
        user_id: Optional[str],
        base_calories: float,
    ) -> tuple[float, float]:
        """
        Apply user's personalization to a calorie estimate.
        
        Args:
            user_id: User identifier
            base_calories: Original calorie estimate
        
        Returns:
            (adjusted_calories, confidence_boost)
        """
        if not user_id:
            return base_calories, 0.0
        
        profile = VisionFeedbackService.get_personalization_profile(user_id)
        if not profile:
            return base_calories, 0.0
        
        # Only apply personalization if we have enough confidence
        if profile.confidence_score < 0.3:
            logger.debug(
                f"Personalization confidence too low for user {user_id}: "
                f"{profile.confidence_score:.2f}"
            )
            return base_calories, 0.0
        
        # Apply portion factor
        adjusted_calories = base_calories * profile.avg_portion_factor
        
        # Confidence boost proportional to personalization confidence
        confidence_boost = profile.confidence_score * 0.1  # Max +10% confidence
        
        logger.info(
            f"Applied personalization for user {user_id}: "
            f"{base_calories:.0f} → {adjusted_calories:.0f} kcal "
            f"(factor={profile.avg_portion_factor:.2f}, boost={confidence_boost:.2f})"
        )
        
        return adjusted_calories, confidence_boost
    
    @staticmethod
    def get_feedback_stats(
        user_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get feedback statistics for analysis.
        
        Returns:
            Dictionary with feedback metrics
        """
        # Build query based on filters
        filters = []
        params = {"days": days}
        
        if user_id:
            filters.append("user_id = :user_id")
            params["user_id"] = user_id
        
        filter_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        
        query_str = f"""
            SELECT
                COUNT(*) as total_feedback,
                COUNT(DISTINCT user_id) as unique_users,
                AVG(CASE WHEN portion_adjustment IS NOT NULL THEN portion_adjustment END) as avg_portion_adj,
                COUNT(CASE WHEN feedback_type = 'confirmed' THEN 1 END) as confirmations,
                COUNT(CASE WHEN feedback_type = 'corrected_dish' THEN 1 END) as dish_corrections,
                COUNT(CASE WHEN feedback_type = 'corrected_portion' THEN 1 END) as portion_corrections,
                COUNT(CASE WHEN quick_feedback = 'accurate' THEN 1 END) as thumbs_up,
                COUNT(CASE WHEN quick_feedback IN ('too_high', 'too_low', 'wrong_dish') THEN 1 END) as thumbs_down
            FROM vision_feedback
            {filter_clause}
                AND created_at >= NOW() - INTERVAL ':days days'
        """
        
        with engine.connect() as conn:
            result = conn.execute(text(query_str), params)
            row = result.fetchone()
            
            if not row:
                return {}
            
            return {
                "total_feedback": row[0] or 0,
                "unique_users": row[1] or 0,
                "avg_portion_adjustment": float(row[2]) if row[2] else 1.0,
                "confirmations": row[3] or 0,
                "dish_corrections": row[4] or 0,
                "portion_corrections": row[5] or 0,
                "thumbs_up": row[6] or 0,
                "thumbs_down": row[7] or 0,
                "accuracy_rate": (row[6] / row[0] * 100) if row[0] > 0 else 0.0,
            }
