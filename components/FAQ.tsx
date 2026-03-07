import React from 'react';
import styles from './FAQ.module.css';

export default function FAQ({ dict }: { dict: any }) {
    const faqs = [
        { q: dict.q1, a: dict.a1 },
        { q: dict.q2, a: dict.a2 }
    ];

    return (
        <section className={styles.faqContainer}>
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
