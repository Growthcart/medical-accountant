'use client';
import { useState } from 'react';

const A = { 'data-astro-cid-vekgkm42': '' }; // scoped form styles in the design CSS key off this attribute
const TYPES = ['Hospital Consultant', 'GP Practice', 'Locum Doctor', 'Dental Associates', 'Dental Practice'];
const PAYROLL = ['Only one -Owner', '1-5', '5-10', '10+'];
const HEARD = ['Google Search Organic', 'Google Ads', 'Medical Magazine', 'Referred by Friend', 'Others'];

const Select = ({ id, name, label, options }) => (
  <div {...A}>
    <label htmlFor={id}>{label}</label>
    <select id={id} name={name} className="input-field" defaultValue="">
      <option value="">Please select…</option>
      {options.map((o) => (<option key={o} value={o}>{o}</option>))}
    </select>
  </div>
);

export default function EnquiryForm({ variant = 'enquiry' }) {
  const [status, setStatus] = useState('idle');

  async function onSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/enquiry/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(e.currentTarget)), variant }),
      });
      if (!res.ok) throw new Error(String(res.status));
      window.location.href = '/thank-you/';
    } catch {
      setStatus('failed');
    }
  }

  return (
    <>
      <form className="form-card contact-form relative text-left" onSubmit={onSubmit}>
        <div className="contact-form__row" {...A}>
          <div {...A}>
            <label htmlFor="cf-name">Name<span className="contact-form__req" aria-hidden="true" {...A}>*</span></label>
            <input type="text" id="cf-name" name="name" autoComplete="name" maxLength={100} required />
          </div>
          <div {...A}>
            <label htmlFor="cf-email">Email<span className="contact-form__req" aria-hidden="true" {...A}>*</span></label>
            <input type="email" id="cf-email" name="email" autoComplete="email" maxLength={254} required />
          </div>
        </div>
        <div className="contact-form__row" {...A}>
          <div {...A}>
            <label htmlFor="cf-phone">Contact Number<span className="contact-form__req" aria-hidden="true" {...A}>*</span></label>
            <input type="tel" id="cf-phone" name="phone" autoComplete="tel" maxLength={40} required />
          </div>
          {variant === 'contact'
            ? <Select id="cf-heard" name="heardAbout" label="Where did you hear about us?" options={HEARD} />
            : <Select id="cf-type" name="professionalType" label="Type of Medical Professional?" options={TYPES} />}
        </div>
        {variant !== 'contact' && (
          <div className="contact-form__row" {...A}>
            <Select id="cf-payroll" name="payroll" label="No. of People on Payroll" options={PAYROLL} />
          </div>
        )}
        <div className="contact-form__field" {...A}>
          <label htmlFor="cf-message">{variant === 'contact' ? 'Message' : 'Your Requirements'}</label>
          <textarea id="cf-message" name="message" rows={5} maxLength={2000} />
        </div>
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="cf-office-ref">Office reference</label>
          <input type="text" id="cf-office-ref" name="office_ref" tabIndex={-1} autoComplete="off" />
        </div>
        <p className="contact-form__note" {...A}>Fields marked * are required.</p>
        <div className="contact-form__actions" {...A}>
          <button type="submit" className="btn-gold" disabled={status === 'sending'} {...A}>{status === 'sending' ? 'Sending…' : 'Send'}</button>
        </div>
      </form>
      {status === 'failed' && (
        <p className="form-success--inline" role="status" aria-live="polite">
          Sorry, something went wrong sending your enquiry. Please try again, or email info@medicalaccountant.ie.
        </p>
      )}
    </>
  );
}
