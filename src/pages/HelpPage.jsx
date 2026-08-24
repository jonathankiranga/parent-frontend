import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HelpPage() {
  const navigate = useNavigate();
  return (
    <div style={{ backgroundColor: '#F8F8F8', minHeight: '100vh' }}>
      <div className="navbar px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="btn-ghost text-sm">← Back</button>
          <h1 className="text-base font-bold" style={{ color: '#333' }}>Help & Guide</h1>
          <div style={{ width: 60 }} />
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-6">

        <div className="card p-5">
          <h2 className="text-base font-bold mb-4" style={{ color: '#7B4F9B' }}>Logging In</h2>
          <p className="text-sm leading-relaxed" style={{ color: '#666' }}>Open the app and go to the Parent Portal. Enter your phone number (the one you registered with the school), then enter the 4-digit code sent via WhatsApp.</p>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-bold mb-4" style={{ color: '#7B4F9B' }}>Your Dashboard</h2>
          <p className="text-sm leading-relaxed" style={{ color: '#666' }}>After logging in, you can see your children's names, classes, last attendance status, and fee balance. If you have multiple children, they all appear on one screen.</p>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-bold mb-4" style={{ color: '#7B4F9B' }}>Free Features</h2>
          <p className="text-sm leading-relaxed" style={{ color: '#666' }}>View your children's attendance anytime. Check their class and last attendance date. Log in from any phone.</p>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-bold mb-4" style={{ color: '#7B4F9B' }}>Subscription — KSh 100/term</h2>
          <div className="space-y-2 text-sm" style={{ color: '#666' }}>
            <p>✓ <b>Daily absence alerts</b> — notified immediately when your child is marked Absent</p>
            <p>✓ <b>3+ day absence warnings</b> — escalated alert for consecutive absences</p>
            <p>✓ <b>Assessment results</b> — scores and performance levels sent to your WhatsApp</p>
            <p>✓ <b>Fee balance reminders</b> — tap to get your current balance on WhatsApp</p>
            <p>✓ <b>School broadcast messages</b> — important announcements from the school</p>
            <p>✓ <b>All children covered</b> — one subscription for the whole family</p>
          </div>
          <p className="text-sm mt-3" style={{ color: '#333' }}>Tap <b>Upgrade</b> on your dashboard to subscribe. Pay via M-Pesa � you confirm every payment with your own PIN.</p>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-bold mb-4" style={{ color: '#7B4F9B' }}>Fee Balance</h2>
          <p className="text-sm leading-relaxed" style={{ color: '#666' }}>Once subscribed, tap <b>Fee Statement</b> under any child to download their current fee balance as a PDF.</p>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-bold mb-4" style={{ color: '#7B4F9B' }}>Quick Tips</h2>
          <div className="space-y-2 text-sm" style={{ color: '#666' }}>
            <p>• Keep your phone number updated with the school</p>
            <p>• OTPs are sent via WhatsApp — make sure WhatsApp is working</p>
            <p>• One subscription covers all children linked to your number</p>
            <p>• For help, ask your school head or contact Smarternow Data Venture</p>
          </div>
        </div>
      </div>
    </div>
  );
}
