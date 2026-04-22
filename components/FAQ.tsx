import React from 'react';
import styles from './FAQ.module.css';

export default function FAQ({ dict }: { dict: any }) {
    const faqs = [
        { q: dict.q1, a: dict.a1 },
        { q: dict.q2, a: dict.a2 },
        { q: dict.q3, a: dict.a3 },
        { q: dict.q4, a: dict.a4 },
        { q: dict.q5, a: dict.a5 }
    ];

    // JSON-LD FAQPage schema — enables FAQ rich results in Google Search.
    // Data is derived from the same dict to avoid divergence.
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map((faq) => ({
            "@type": "Question",
            "name": faq.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.a
            }
        }))
    };

    return (
        <section className={styles.faqContainer}>
            {/* FAQPage structured data for Google Rich Results */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <h2 className={styles.title}>{dict.title}</h2>
            <div className={styles.accordion}>
                {faqs.map((faq, index) => (
                    <div key={index} className={styles.faqItem}>
                        <input type="checkbox" id={`faq-${index}`} className={styles.toggle} />
                        <label htmlFor={`faq-${index}`} className={styles.question}>
                            {faq.q}
                            <span className={styles.icon}>+</span>
                        </label>
                        <div className={styles.answer}>
                            <p>{faq.a}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
