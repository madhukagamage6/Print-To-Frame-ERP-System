import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, Copy, Check, ExternalLink, Sparkles, X, FileText, 
  Send, RefreshCw, Layers, User, Shield 
} from 'lucide-react';
import ModalWrapper from './detail-modal/ModalWrapper';
import { EMAIL_TEMPLATES, interpolateTemplate } from '../../../constants/emailTemplates';
import { toast } from '../../../utils/toast';

export default function EmailTemplateModal({
  isOpen = false,
  onClose,
  recipient = {},
  initialTemplateId,
  currentUser
}) {
  // Determine default template based on recipient role or provided prop
  const defaultTemplateId = useMemo(() => {
    if (initialTemplateId) return initialTemplateId;
    const role = recipient?.role;
    if (role === 'Partner') return 'partner_approval';
    if (role === 'Business Client') return 'client_approval';
    if (['Admin', 'Manager', 'Sales', 'Operations', 'Support', 'Accounts', 'Logistics'].includes(role)) {
      return 'employee_invite';
    }
    return 'partner_approval';
  }, [recipient, initialTemplateId]);

  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const [templateCategory, setTemplateCategory] = useState('ALL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const categories = useMemo(() => {
    return ['ALL', ...new Set(EMAIL_TEMPLATES.map(t => t.category))];
  }, []);

  const filteredTemplates = useMemo(() => {
    if (templateCategory === 'ALL') return EMAIL_TEMPLATES;
    return EMAIL_TEMPLATES.filter(t => t.category === templateCategory);
  }, [templateCategory]);

  // Template definition
  const activeTemplate = useMemo(() => {
    return EMAIL_TEMPLATES.find(t => t.id === selectedTemplateId) || EMAIL_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Build interpolation data
  const templateVariables = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portal.print2frame.xyz';
    return {
      recipientName: recipient?.name || recipient?.businessName || 'Valued Partner',
      companyName: recipient?.company || recipient?.businessName || recipient?.name || 'Company',
      partnerId: recipient?.partnerId || (recipient?.identifier ? `P-${recipient.identifier.slice(0, 5).toUpperCase()}` : 'P-PARTNER'),
      loginEmail: recipient?.identifier || recipient?.email || '',
      tempPassword: recipient?.tempPassword || recipient?.password || '[Generated on Enrollment]',
      assignedRole: recipient?.role || 'Authorized Member',
      requestedRole: recipient?.role || 'Partner Access',
      contactPhone: recipient?.contactNumber || recipient?.mobile || recipient?.phone || '+94 71 141 9027',
      portalUrl: origin,
      senderName: currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Admin'})` : 'Print To Frame Admin Desk',
      supportEmail: 'support@print2frame.xyz',
    };
  }, [recipient, currentUser]);

  // Update subject and body when template or variables change
  useEffect(() => {
    if (activeTemplate) {
      setSubject(interpolateTemplate(activeTemplate.subject, templateVariables));
      setBody(interpolateTemplate(activeTemplate.body, templateVariables));
    }
  }, [activeTemplate, templateVariables]);

  const handleCopySubject = async () => {
    try {
      await navigator.clipboard.writeText(subject);
      setCopiedSubject(true);
      toast.success('Email Subject copied to clipboard!');
      setTimeout(() => setCopiedSubject(false), 2000);
    } catch (e) {
      toast.error('Failed to copy subject');
    }
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedBody(true);
      toast.success('Email Body copied to clipboard!');
      setTimeout(() => setCopiedBody(false), 2000);
    } catch (e) {
      toast.error('Failed to copy email body');
    }
  };

  const handleCopyAll = async () => {
    try {
      const fullText = `Subject: ${subject}\n\n${body}`;
      await navigator.clipboard.writeText(fullText);
      setCopiedAll(true);
      toast.success('Complete Email Draft (Subject & Body) copied!');
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (e) {
      toast.error('Failed to copy draft');
    }
  };

  const handleOpenGmailWeb = () => {
    const toEmail = recipient?.identifier || recipient?.email || '';
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    toast.success('Opening Gmail draft in new browser tab...');
  };

  const handleOpenMailClient = () => {
    const toEmail = recipient?.identifier || recipient?.email || '';
    const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    toast.info('Opening in default mail application...');
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-3xl"
      height="h-[95dvh] sm:h-[90vh] max-h-[900px]"
      ariaLabel="Email Communication Composer"
    >
      {/* Modal Top Header */}
      <div className="px-6 py-4.5 border-b border-outline-variant bg-surface-container-low/80 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20 flex-shrink-0">
            <Mail size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-on-surface truncate">
              Email Template Dispatcher
            </h3>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5 truncate">
              Auto-Interpolated Notification for <span className="text-primary font-extrabold">{recipient?.name || recipient?.identifier || 'Recipient'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-on-surface-variant hover:text-on-surface bg-surface-container-high rounded-full border border-outline-variant/60 transition-colors"
          title="Close Modal"
        >
          <X size={18} />
        </button>
      </div>

      {/* Modal Content Body */}
      <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
        
        {/* Template Selector Bar */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">
              Select Email Template ({filteredTemplates.length} of {EMAIL_TEMPLATES.length}):
            </label>
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTemplateCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition-colors whitespace-nowrap cursor-pointer ${
                    templateCategory === cat
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'bg-surface-container-high text-on-surface-variant border-outline-variant/60 hover:text-on-surface'
                  }`}
                >
                  {cat === 'ALL' ? 'All Templates' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar p-1">
            {filteredTemplates.map((tmpl) => {
              const isSelected = selectedTemplateId === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`p-3 text-left rounded-xl border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-primary/15 border-primary text-on-surface ring-1 ring-primary shadow-sm'
                      : 'bg-surface-container-low hover:bg-surface-container-high/60 border-outline-variant/60 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <div className="font-bold text-xs line-clamp-1 mb-1">{tmpl.title}</div>
                  <div className="flex items-center justify-between text-[9px] opacity-70 font-mono mt-1">
                    <span>{tmpl.category}</span>
                    {isSelected && <span className="font-bold text-primary uppercase">Active</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Variables Chip Summary */}
        <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 flex items-center gap-2 flex-wrap text-[11px]">
          <span className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider mr-1">
            Data Context:
          </span>
          <span className="bg-surface-container-high px-2 py-0.5 rounded-md font-medium text-on-surface">
            To: <span className="font-bold text-primary">{recipient?.identifier || recipient?.email || 'N/A'}</span>
          </span>
          <span className="bg-surface-container-high px-2 py-0.5 rounded-md font-medium text-on-surface">
            Role: <span className="font-bold">{recipient?.role || 'Partner'}</span>
          </span>
          {recipient?.partnerId && (
            <span className="bg-surface-container-high px-2 py-0.5 rounded-md font-mono text-on-surface">
              ID: <span className="font-bold text-amber-400">{recipient.partnerId}</span>
            </span>
          )}
        </div>

        {/* Subject Line Input + Copy Button */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">
              Email Subject Line
            </label>
            <button
              type="button"
              onClick={handleCopySubject}
              className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              {copiedSubject ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedSubject ? 'Copied!' : 'Copy Subject'}</span>
            </button>
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs sm:text-sm font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Email Message Body Textarea + Copy Button */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">
              Message Body (Editable Preview)
            </label>
            <button
              type="button"
              onClick={handleCopyBody}
              className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              {copiedBody ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedBody ? 'Copied Body!' : 'Copy Body'}</span>
            </button>
          </div>
          <textarea
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full p-4 bg-surface-container-low border border-outline-variant rounded-2xl text-xs font-mono leading-relaxed text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary custom-scrollbar resize-y"
          />
        </div>

      </div>

      {/* Modal Bottom Footer Actions */}
      <div className="p-4 sm:p-5 border-t border-outline-variant bg-surface-container-low/90 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-3 flex-shrink-0">
        <div className="text-[11px] text-on-surface-variant font-medium text-center sm:text-left">
          Ready to paste into <span className="font-bold text-on-surface">Gmail, Outlook, or Apple Mail</span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={handleCopyAll}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all active:scale-95 cursor-pointer ${
              copiedAll
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-surface-container-high hover:bg-surface-variant text-on-surface border-outline-variant/60'
            }`}
          >
            {copiedAll ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedAll ? 'Draft Copied!' : 'Copy Full Draft'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenMailClient}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-surface-container-high hover:bg-surface-variant text-on-surface border border-outline-variant/60 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Open in default desktop mail application (Apple Mail, Outlook, Thunderbird)"
          >
            <ExternalLink size={14} />
            <span>Default Mail Client</span>
          </button>

          <button
            type="button"
            onClick={handleOpenGmailWeb}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-primary text-on-primary font-bold text-xs sm:text-sm rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(0,218,243,0.3)] active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            title="Open pre-filled draft in Gmail Web browser tab"
          >
            <Send size={14} />
            <span>Open in Gmail (Web)</span>
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
