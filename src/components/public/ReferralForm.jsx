import React, { useState, useEffect } from 'react';
import { db, storage } from '../../services/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { COLLECTIONS } from '../../services/firestoreSync';
import { validatePhone, validateEmail, formatPhone } from '../../utils/validation';
import { 
  Check, Info, Upload, Phone, Mail, Building, 
  Sparkles, Clock, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight 
} from 'lucide-react';

const FRAMING_TYPES = [
  'Custom Steel Box Iron Frame',
  'High-Tension Canvas Gallery Wrap',
  'Classic Fine Art Wood Frame',
  'Acrylic Glass Modern Float Frame',
  'Large Commercial Architecture Framing'
];

export default function ReferralForm() {
  const [partnerId, setPartnerId] = useState('');
  const [partnerDetails, setPartnerDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedLeadId, setSubmittedLeadId] = useState(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    framingType: 'Custom Steel Box Iron Frame',
    dimensions: '',
    projectDescription: '',
  });

  const [artworkFile, setArtworkFile] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('ref') || params.get('partnerId');
    
    if (pid) {
      setPartnerId(pid);
      fetchPartnerDetails(pid);
    } else {
      setIsLoading(false);
      setError('Referral code is missing. Please scan a valid partner QR code.');
    }
  }, []);

  const fetchPartnerDetails = async (pid) => {
    try {
      const partnersRef = collection(db, COLLECTIONS.PARTNERS);
      const q = query(partnersRef, where('partnerId', '==', pid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setPartnerDetails(querySnapshot.docs[0].data());
      } else {
        // Fallback: check by ID or partner_applications
        const q2 = query(partnersRef, where('id', '==', Number(pid) || 0));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          setPartnerDetails(snap2.docs[0].data());
        } else {
          // Set standard partner fallback
          setPartnerDetails({ name: 'Verified Framing Partner', partnerId: pid });
        }
      }
    } catch (err) {
      console.error("Error fetching partner:", err);
      setPartnerDetails({ name: 'Verified Partner Studio', partnerId: pid });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData(prev => ({ ...prev, [name]: formatPhone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Artwork image must be under 10MB.');
        return;
      }
      setArtworkFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Your Name is required.');
      return;
    }
    if (!formData.phone.trim() || !validatePhone(formData.phone)) {
      setError('Please provide a valid phone number (e.g. +94 77 123 4567).');
      return;
    }
    if (formData.email && !validateEmail(formData.email)) {
      setError('Invalid email address.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const leadId = `LD-${String(Date.now()).slice(-6)}`;
      let artworkUrl = '';

      if (artworkFile && storage) {
        try {
          const fileRef = ref(storage, `leads/${leadId}/artwork_${artworkFile.name}`);
          const snapshot = await uploadBytes(fileRef, artworkFile);
          artworkUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadErr) {
          console.warn("Artwork upload fallback:", uploadErr);
        }
      }

      const now = Date.now();
      const slaDeadline = new Date(now + 5 * 60 * 1000).toISOString(); // 5-minute callback SLA

      const leadData = {
        id: leadId,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || '',
        company: '',
        jobScope: `[${formData.framingType}] ${formData.dimensions ? `Dimensions: ${formData.dimensions}. ` : ''}${formData.projectDescription}`,
        framingType: formData.framingType,
        artworkUrl: artworkUrl || '',
        source: 'Partner Referral',
        agentId: partnerId,
        agentName: partnerDetails?.name || partnerId,
        partnerId: partnerId,
        partnerName: partnerDetails?.name || partnerId,
        commissionRate: partnerDetails?.commissionRate || 0.05,
        stage: 'Intake',
        value: 0,
        totalSqFt: 0,
        callbackSlaDeadline: slaDeadline,
        callbackStatus: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, COLLECTIONS.LEADS, leadId), leadData);
      setSubmittedLeadId(leadId);
    } catch (err) {
      console.error("Error submitting referral lead:", err);
      setError('Failed to submit inquiry: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-bold text-on-surface-variant font-mono tracking-widest uppercase">
        Verifying Partner QR Attribution...
      </div>
    );
  }

  if (submittedLeadId) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 sm:p-6 text-on-surface">
        <div className="max-w-md w-full bg-surface-container-high p-8 rounded-3xl border border-outline shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto border-2 border-primary/40 shadow-[0_0_30px_rgba(0,218,243,0.3)]">
            <CheckCircle2 size={44} />
          </div>

          <div>
            <span className="text-[10px] uppercase font-black text-primary tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/30">
              5-Minute Specialist SLA Triggered
            </span>
            <h2 className="text-2xl font-black text-on-surface mt-3">Inquiry Received!</h2>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              Thank you, <span className="font-bold text-on-surface">{formData.name}</span>. Your framing requirements have been sent directly to our framing workshop.
            </p>
          </div>

          <div className="p-4 bg-surface-container-highest rounded-2xl border border-outline text-left space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-on-surface-variant">Inquiry Reference:</span>
              <span className="font-bold text-primary">{submittedLeadId}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-on-surface-variant">Referring Partner:</span>
              <span className="font-bold text-on-surface">{partnerDetails?.name || partnerId}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-on-surface-variant">Response SLA:</span>
              <span className="font-bold text-emerald-400">Callback within 5 Minutes</span>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-left text-on-surface space-y-1">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Clock size={14} /> Need an instant quote right now?
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              You can reach our senior framing engineer directly via WhatsApp.
            </p>
          </div>

          <button
            onClick={() => window.open(`https://wa.me/94771234567?text=Hi%20Print%20To%20Frame,%20I%20just%20submitted%20referral%20${submittedLeadId}%20via%20${partnerDetails?.name || partnerId}`, '_blank')}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Phone size={14} /> Open Instant WhatsApp Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8 px-4 sm:px-6 lg:px-8 text-on-surface flex justify-center items-center">
      <div className="max-w-xl w-full space-y-6">
        
        {/* Co-Branded Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold mb-1">
            <Sparkles size={13} /> Print To Frame • Partner Referral
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">
            Get a Custom Framing Quote
          </h1>
          {partnerDetails && (
            <p className="text-xs text-on-surface-variant font-medium">
              Recommended by <span className="text-primary font-bold">{partnerDetails.name}</span>
            </p>
          )}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-surface-container-high rounded-3xl border border-outline p-6 sm:p-8 shadow-2xl space-y-6">
          
          {error && (
            <div className="p-3.5 bg-error/15 border border-error/30 rounded-xl flex items-center gap-2 text-error text-xs font-bold">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Client Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">
                Your Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Kasun Perera"
                className="w-full px-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">
                  Mobile Number (+94) *
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+94 7X XXX XXXX"
                  className="w-full px-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-mono font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@domain.com"
                  className="w-full px-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Framing Type */}
            <div>
              <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">
                Framing Style / Requirement
              </label>
              <select
                name="framingType"
                value={formData.framingType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {FRAMING_TYPES.map(t => (
                  <option key={t} value={t} className="bg-surface-container text-on-surface">{t}</option>
                ))}
              </select>
            </div>

            {/* Dimensions */}
            <div>
              <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">
                Approximate Dimensions (Optional)
              </label>
              <input
                type="text"
                name="dimensions"
                value={formData.dimensions}
                onChange={handleChange}
                placeholder="e.g. 24 x 36 inches or 60 x 90 cm"
                className="w-full px-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Project Notes */}
            <div>
              <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">
                Additional Notes / Scope
              </label>
              <textarea
                name="projectDescription"
                rows={3}
                value={formData.projectDescription}
                onChange={handleChange}
                placeholder="Mention wall space, matting preferences, or glass type..."
                className="w-full p-3 bg-surface-container-highest/60 border border-outline rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Artwork Upload */}
            <div>
              <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">
                Upload Artwork or Space Photo (Optional)
              </label>
              <div className="p-3.5 bg-surface-container-highest/40 rounded-xl border border-dashed border-outline text-center">
                <input 
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-on-primary cursor-pointer"
                />
                {artworkFile && (
                  <div className="text-xs font-bold text-primary mt-1.5">Selected: {artworkFile.name}</div>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 bg-primary text-on-primary hover:bg-primary/90 font-black text-sm rounded-xl shadow-[0_0_25px_rgba(0,218,243,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${
                isSubmitting ? 'opacity-50 cursor-wait' : ''
              }`}
            >
              {isSubmitting ? (
                <span>Submitting Your Framing Inquiry...</span>
              ) : (
                <>
                  <span>Request 5-Minute Framing Callback</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-on-surface-variant mt-2.5">
              Instant response guarantee • Custom engineering in Sri Lanka
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}
