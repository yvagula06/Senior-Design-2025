import React from "react";
import './styles.css';
export default function AboutPage() {
    return (
        <main style={styles.container} aria-labelledby="about-heading">
            <h1 id="about-heading" style={styles.title}>About MacroVerify</h1>

            <p style={styles.paragraph}>
                MacroVerify is a senior design project: a simple app to estimate nutrition
                (macros and calories) to help users track and verify their dietary intake.
            </p>

            <section style={styles.section} aria-labelledby="team-heading">
                <h2 id="team-heading" style={styles.subTitle}>The Team</h2>
                <ul style={styles.list}>
                    <li style={styles.card}>Rached</li>
                    <li style={styles.card}>Raj</li>
                    <li style={styles.card}>Harry</li>
                    <li style={styles.card}>Matt</li>
                </ul>
            </section>

            <footer style={styles.footer}>
                <small>Built as part of a senior design course.</small>
            </footer>
        </main>
    );
}

const styles = {
    container: {
        maxWidth: 720,
        margin: "32px auto",
        padding: "24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        color: "#222",
        lineHeight: 1.5,
    },
    title: {
        margin: "0 0 12px 0",
        fontSize: 28,
    },
    subTitle: {
        margin: "16px 0 8px 0",
        fontSize: 18,
    },
    paragraph: {
        margin: "0 0 12px 0",
    },
    section: {
        marginTop: 8,
    },
   
    footer: {
        marginTop: 24,
        color: "#666",
    },
    list: {
    margin: 0,
    paddingLeft: 0,
    display: "flex",
    gap: "16px",
    listStyle: "none",
},
card: {
padding: "12px 16px",
background: "#f9fbe7ff",
borderRadius: "12px",
boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
fontWeight: 500,
},

};