import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, User, Building, Phone, Mail, Link, FileText, 
  Trash2, Play, Check, Calculator, MapPin, 
  FileSpreadsheet, Sparkles, Printer, Save, Clock,
  Music, Volume2, RefreshCw, CheckCircle2, AlertCircle, Loader2, Truck
} from 'lucide-react';
import { toast } from '../../utils/toast';
import { calculateCost, determineTier } from '../../services/pricingEngine';
import { extractCallScope, generateQuotation, generateAdvanceInvoice } from '../../services/gemini';
import { validatePhone, validateEmail, formatPhone, sanitizeTechnicalScope, stripEmojis } from '../../utils/validation';
import Card from '../common/Card';
import { 
  DetailModalLayout, 
  DetailModalHeader, 
  DetailModalContent, 
  DetailModalSidebar, 
  DetailFieldGroup, 
  DetailCustomerCard, 
  DetailModalFooter,
  StatusBadge 
} from '../common/ui';
import QuotationBuilder from './QuotationBuilder';

// ── Client-Side Audio Downsampler & Compressor ──────────────────────────────
const downsampleAudio = async (file) => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('AudioContext is not supported in this browser.');
      return file;
    }
    const audioCtx = new AudioContextClass();
    const arrayBuffer = await file.arrayBuffer();
    
    // Decode audio data
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    // We target 8000Hz (telecom speech standard, 16KB/sec) to keep payload under Vercel limits
    const targetSampleRate = 8000;
    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      1, // 1 channel (mono)
      Math.round(decodedBuffer.duration * targetSampleRate),
      targetSampleRate
    );
    
    // Create source node
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    // Render
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Convert renderedBuffer to WAV Blob
    const wavBlob = audioBufferToWav(renderedBuffer);
    return new File([wavBlob], 'compressed_recording.wav', { type: 'audio/wav' });
  } catch (err) {
    console.warn('Audio downsampling failed, falling back to original file:', err);
    return file;
  }
};

function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // raw PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 1) {
    result = buffer.getChannelData(0);
  } else {
    const c0 = buffer.getChannelData(0);
    const c1 = buffer.getChannelData(1);
    result = new Float32Array(c0.length);
    for (let i = 0; i < c0.length; i++) {
      result[i] = (c0[i] + c1[i]) / 2;
    }
  }
  
  const bufferLength = result.length;
  const wavBuffer = new ArrayBuffer(44 + bufferLength * 2);
  const view = new DataView(wavBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bufferLength * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, bufferLength * 2, true);
  
  let offset = 44;
  for (let i = 0; i < bufferLength; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export default function LeadCardDetails({ 
  lead, 
  onClose, 
  onSave, 
  onSaveInvoice, 
  onMarkInvoicePaid,
  onConvert,
  partners = [], 
  customers = [],
  currentUser,
  allQuotations = [],
  isDeal = false,
  logisticsJobs = [],
  onCreateLogistics,
  invoices = []
}) {
  const defaultFormData = {
    name: lead.name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    company: lead.company || '',
    source: lead.source || 'Manual',
    agentId: lead.agentId || '',
    jobScope: lead.jobScope || '',
    deliveryLocation: lead.deliveryLocation || '',
    value: lead.value || 0,
    totalSqFt: lead.totalSqFt || 0,
    pricingMetadata: lead.pricingMetadata || null,
    quotationDraft: lead.quotationDraft || '',
    quotationGenerated: lead.quotationGenerated || false,
    invoiceDraft: lead.invoiceDraft || '',
    invoiceGenerated: lead.invoiceGenerated || false,
    invoicePaid: lead.invoicePaid || false,
  };
  const [formData, setFormData] = useState(defaultFormData);
  const [initialDataStr] = useState(JSON.stringify(defaultFormData));
  const [isDirty, setIsDirty] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  useEffect(() => {
    setIsDirty(JSON.stringify(formData) !== initialDataStr);
  }, [formData, initialDataStr]);

  // UI state
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [convertError, setConvertError] = useState('');

  // AI Call Recording Analyzer states
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('idle'); // 'idle' | 'reading' | 'validating' | 'compressing' | 'ready' | 'error'
  const [uploadStageText, setUploadStageText] = useState('');
  const [preparedAudioData, setPreparedAudioData] = useState(null);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [audioAnalysisStage, setAudioAnalysisStage] = useState('');
  const [audioAnalysisResult, setAudioAnalysisResult] = useState('');
  const [audioError, setAudioError] = useState('');
  const fileInputRef = useRef(null);

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  // Cost calculator fields
  const [calcLength, setCalcLength] = useState(0);
  const [calcHeight, setCalcHeight] = useState(0);
  const [calcSqFt, setCalcSqFt] = useState(0);
  const [calcTier, setCalcTier] = useState('0-50');
  const [dimensionsLocked, setDimensionsLocked] = useState(!!lead.pricingMetadata);

  // Initialize dimensions from pricingMetadata if available
  useEffect(() => {
    if (lead.pricingMetadata && lead.pricingMetadata.dimensions) {
      setCalcLength(lead.pricingMetadata.dimensions.length || 0);
      setCalcHeight(lead.pricingMetadata.dimensions.height || 0);
    }
  }, [lead.pricingMetadata]);

  // Customer cross-check popup/alert state
  const [matchedCustomer, setMatchedCustomer] = useState(null);

  // Keep track of calculated sqft
  useEffect(() => {
    const sqft = Math.max(0, calcLength * calcHeight);
    setCalcSqFt(sqft);
    if (sqft > 0) {
      setCalcTier(determineTier(sqft));
    }
  }, [calcLength, calcHeight]);

  const activePricing = useMemo(() => {
    if (calcSqFt > 0) {
      return calculateCost(calcTier, calcSqFt);
    }
    return null;
  }, [calcTier, calcSqFt]);

  const applyPricingToLead = () => {
    if (activePricing) {
      const fixedValue = Number(activePricing.finalAmount.toFixed(2));
      setFormData(prev => ({
        ...prev,
        value: fixedValue,
        totalSqFt: calcSqFt,
        pricingMetadata: {
          ...activePricing,
          finalAmount: fixedValue,
          dimensions: { length: calcLength, height: calcHeight }
        }
      }));
      setDimensionsLocked(true);
    }
  };

    // Enforce +94 country code on phone number input
  const handlePhoneChange = (val) => {
    const formatted = formatPhone(val);
    setFormData(prev => ({ ...prev, phone: formatted }));

    // Limit digits for cross-check
    const digitsOnly = formatted.substring(3).replace(/\s+/g, '');

    // Database cross-checking: Check if contact number exists in customers database
    if (digitsOnly.length >= 9) {
      const match = customers.find(c => {
        const cPhone = c.phone?.replace(/[^\d+]/g, '');
        const targetPhone = formatted.replace(/\s+/g, '');
        return cPhone === targetPhone || (cPhone?.endsWith(digitsOnly));
      });
      if (match) {
        setMatchedCustomer(match);
      } else {
        setMatchedCustomer(null);
      }
    } else {
      setMatchedCustomer(null);
    }
  };

  const autofillCustomerDetails = () => {
    if (matchedCustomer) {
      setFormData(prev => ({
        ...prev,
        name: matchedCustomer.name || prev.name,
        company: matchedCustomer.businessName || prev.company,
        email: matchedCustomer.email || prev.email,
      }));
      setMatchedCustomer(null); // Clear prompt
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Clear agent selection if source is not Referral
      if (name === 'source' && value !== 'Referral') {
        updated.agentId = '';
      }
      return updated;
    });
  };

  const handleAudioFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset previous audio state
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    setAudioFile(file);
    setAudioAnalysisResult('');
    setAudioError('');
    setPreparedAudioData(null);
    setUploadProgress(10);
    setUploadStage('reading');
    setUploadStageText('Reading audio file...');

    try {
      // Step 1: Create local preview URL for immediate in-modal playback
      const previewUrl = URL.createObjectURL(file);
      setAudioPreviewUrl(previewUrl);

      // Step 2: Validate audio extension and MIME
      const EXTENSION_MIME_MAP = {
        mp3: 'audio/mpeg',
        m4a: 'audio/mp4',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        webm: 'audio/webm',
        aac: 'audio/aac',
        flac: 'audio/flac',
      };
      const ext = (file.name || '').split('.').pop()?.toLowerCase();
      const detectedMime = file.type || EXTENSION_MIME_MAP[ext] || 'audio/mpeg';

      // CRITICAL FIX: If the file is already a compressed format (MP3, M4A, AAC, OGG, WEBM)
      // and under 3.2MB, NEVER decode it to uncompressed WAV (which expands 2.8MB MP3 to 10.2MB WAV).
      // Keep it in its original compressed stream!
      const COMPRESSED_FORMATS = ['mp3', 'm4a', 'aac', 'ogg', 'webm'];
      const isAlreadyCompressed = COMPRESSED_FORMATS.includes(ext) || (file.type && !file.type.includes('wav'));
      const MAX_PAYLOAD_RAW_SIZE = 3.2 * 1024 * 1024; // 3.2MB (translates to ~4.2MB Base64, fitting under Vercel's 4.5MB limit)

      setUploadProgress(35);
      setUploadStage('validating');
      setUploadStageText(`Validated format (${ext?.toUpperCase() || 'Audio'}) • Checking payload size...`);

      // Micro-pause for smooth visual perception
      await new Promise(r => setTimeout(r, 200));

      let processedBlob = file;
      let finalMime = detectedMime;
      let isCompressed = false;

      if (!isAlreadyCompressed && file.size > MAX_PAYLOAD_RAW_SIZE) {
        // Large uncompressed WAV file: downsample to 8kHz mono WAV (telecom speech standard)
        setUploadProgress(60);
        setUploadStage('compressing');
        setUploadStageText(`Optimizing uncompressed WAV audio (${(file.size / 1024 / 1024).toFixed(1)}MB)...`);
        
        try {
          processedBlob = await downsampleAudio(file);
          finalMime = 'audio/wav';
          isCompressed = true;
          setUploadProgress(80);
          setUploadStageText(`Optimized ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(processedBlob.size / 1024 / 1024).toFixed(1)}MB (WAV)`);
        } catch (dsErr) {
          console.warn('Downsampling fallback to original file:', dsErr);
          processedBlob = file;
          finalMime = detectedMime;
        }
      } else {
        setUploadProgress(80);
        setUploadStageText(isAlreadyCompressed 
          ? `Preserving compressed stream (${(file.size / 1024 / 1024).toFixed(2)} MB ${ext?.toUpperCase() || 'Audio'})` 
          : 'Audio size verified • Encoding payload...');
      }

      await new Promise(r => setTimeout(r, 150));

      // Step 4: Convert to Base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
      });
      reader.readAsDataURL(processedBlob);
      const base64Data = await base64Promise;

      // Step 5: Ready
      setPreparedAudioData({
        base64Data,
        mimeType: finalMime,
        originalSizeMB: (file.size / 1024 / 1024).toFixed(2),
        finalSizeMB: (processedBlob.size / 1024 / 1024).toFixed(2),
        isCompressed,
        fileName: file.name,
        formatLabel: ext?.toUpperCase() || 'AUDIO'
      });

      setUploadProgress(100);
      setUploadStage('ready');
      setUploadStageText('Audio ready for AI extraction');
      toast.success('Audio file verified & ready for analysis');
    } catch (err) {
      console.error('Audio ingestion failed:', err);
      setUploadStage('error');
      setUploadStageText('Failed to process audio file');
      setAudioError(err.message || 'Failed to read audio file.');
    }
  };

  const resetAudioFile = (e) => {
    if (e) e.stopPropagation();
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    setAudioFile(null);
    setPreparedAudioData(null);
    setUploadProgress(0);
    setUploadStage('idle');
    setUploadStageText('');
    setAudioAnalysisResult('');
    setAudioError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Call analyzer with simple words & emojis requirement
  const analyzeCallRecording = async () => {
    if (!preparedAudioData || uploadStage !== 'ready') {
      toast.error('Please wait for the audio file to finish preparing.');
      return;
    }

    setIsAnalyzingAudio(true);
    setAudioError('');
    setAudioAnalysisResult('');
    setAudioAnalysisStage('Dispatching audio payload to Gemini AI...');

    try {
      const clientInfo = { name: formData.name, company: formData.company };
      
      // Prompt for clean, professional technical engineering specification
      const instructions = `
        Use formal, professional, engineering and fabrication terminology.
        STRICT REQUIREMENT: Do NOT use any emojis, pictographs, or casual icons.
        Format specifications with clear technical bullet points (e.g. Dimensions, Steel Gauge, Material Type, Finish, Timeline).
      `;
      
      setAudioAnalysisStage('Gemini AI is transcribing Sinhala/English speech & extracting specs...');
      const result = await extractCallScope(
        preparedAudioData.base64Data, 
        preparedAudioData.mimeType, 
        instructions, 
        clientInfo
      );

      if (result && result.scope) {
        result.scope = sanitizeTechnicalScope(result.scope);
      }
      setAudioAnalysisResult(result);
      toast.success('AI extracted engineering scope successfully!');
    } catch (err) {
      setAudioError(err.message || 'Failed to analyze audio recording.');
    } finally {
      setIsAnalyzingAudio(false);
      setAudioAnalysisStage('');
    }
  };

  const applyAudioAnalysisToScope = () => {
    if (!audioAnalysisResult) return;
    
    setFormData(prev => ({ 
      ...prev, 
      jobScope: sanitizeTechnicalScope(audioAnalysisResult.scope || prev.jobScope),
      name: audioAnalysisResult.clientName || prev.name,
      phone: audioAnalysisResult.clientContact || prev.phone,
      email: audioAnalysisResult.clientEmail || prev.email,
      deliveryLocation: audioAnalysisResult.deliveryLocation || prev.deliveryLocation,
    }));

    if (audioAnalysisResult.frameHeight !== undefined && !isNaN(Number(audioAnalysisResult.frameHeight))) {
      setCalcHeight(Number(audioAnalysisResult.frameHeight));
    }
    if (audioAnalysisResult.frameWidth !== undefined && !isNaN(Number(audioAnalysisResult.frameWidth))) {
      setCalcLength(Number(audioAnalysisResult.frameWidth));
    }
    
    // Automatically perform cross-check on extracted phone
    if (audioAnalysisResult.clientContact) {
      const formattedPhone = audioAnalysisResult.clientContact.startsWith('+94') 
        ? audioAnalysisResult.clientContact 
        : '+94' + audioAnalysisResult.clientContact.replace(/[^\d]/g, '').slice(-9);
      handlePhoneChange(formattedPhone);
    }
    
    setAudioAnalysisResult('');
    setAudioFile(null);
  };

  // AI Quote generation incorporating cost calculator structure
  const handleGenerateQuote = async () => {
    if (!formData.jobScope || formData.jobScope.length < 10) {
      setQuoteError('Please enter a descriptive Job Scope before drafting the quote.');
      return;
    }
    setIsGeneratingQuote(true);
    setQuoteError('');

    try {
      const client = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone
      };

      // Call API proxy with the structured formatting requirement
      const draft = await generateQuotation(client, formData.jobScope, formData.deliveryLocation, formData.pricingMetadata, currentUser);
      const updatedData = {
        ...formData,
        quotationDraft: draft,
        quotationGenerated: true
      };
      setFormData(updatedData);
      handleSaveLead(updatedData);
    } catch (err) {
      setQuoteError(err.message || 'Error drafting AI quotation.');
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!formData.quotationGenerated) {
      setInvoiceError('Please generate the quotation first.');
      return;
    }
    setIsGeneratingInvoice(true);
    setInvoiceError('');

    try {
      const client = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone
      };

      const draft = await generateAdvanceInvoice(client, formData.jobScope, formData.value);
      const updatedData = {
        ...formData,
        invoiceDraft: draft,
        invoiceGenerated: true
      };
      setFormData(updatedData);
      handleSaveLead(updatedData);
    } catch (err) {
      setInvoiceError(err.message || 'Error generating AI invoice.');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // Redesigned Print Invoice PDF Styling (Clean, Premium, Modern, Matching Both 75% Advance and 25% Final)
  const printInvoice = (invoiceType = 'Advance') => {
    const isFinal = invoiceType === 'Final';
    const clientHeader = formData.company 
      ? `<strong>${formData.company}</strong><br/><span style="color:#64748b;">Attn: ${formData.name}</span>`
      : `<strong>${formData.name}</strong>`;
    
    const invoiceNo = isFinal ? `FIN-${Math.floor(1000 + Math.random() * 9000)}` : `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalVal = Number(formData.value || lead.value || 0);
    const advanceAmount = totalVal * 0.75;
    const balanceAmount = totalVal * 0.25;
    const invoiceAmount = isFinal ? balanceAmount : advanceAmount;
    const badgeText = isFinal ? '25% Final Settlement Invoice' : '75% Advance Invoice';
    const lineItemTitle = isFinal ? 'Custom Framing Final Settlement Payment (25%)' : 'Custom Framing Advance Payment (75%)';
    const dateStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const activeQuote = (allQuotations || []).find(q => q.leadId === lead.id || q.leadId === lead._firestoreId);
    const lineItemsToPrint = activeQuote?.lineItems && activeQuote.lineItems.length > 0 ? activeQuote.lineItems : null;

    const html = `
      <html>
        <head>
          <title>${invoiceNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 30px;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 24px;
              font-weight: 800;
              color: #4f46e5;
              letter-spacing: -0.05em;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .logo-icon {
              background-color: #4f46e5;
              color: white;
              width: 32px;
              height: 32px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            }
            .meta-box {
              text-align: right;
            }
            .meta-box p {
              margin: 4px 0;
              font-size: 13px;
              color: #64748b;
            }
            .meta-box .invoice-id {
              font-family: 'JetBrains Mono', monospace;
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
            }
            .bill-to-section {
              margin-bottom: 40px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 24px;
            }
            .section-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #94a3b8;
              margin-top: 0;
              margin-bottom: 12px;
            }
            .bill-to-content {
              font-size: 15px;
              line-height: 1.6;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            th {
              background-color: #f1f5f9;
              padding: 16px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #475569;
              text-align: left;
            }
            td {
              padding: 16px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 14px;
              line-height: 1.5;
            }
            .mono-text {
              font-family: 'JetBrains Mono', monospace;
            }
            .totals-container {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 60px;
            }
            .totals-table {
              width: 380px;
              margin-bottom: 0;
            }
            .totals-table td {
              padding: 10px 16px;
              border: none;
            }
            .totals-table tr.grand-total td {
              border-top: 2px solid #4f46e5;
              font-size: 18px;
              font-weight: 800;
              color: #4f46e5;
              padding-top: 16px;
            }
            .payment-terms {
              border-top: 1px solid #f1f5f9;
              padding-top: 30px;
              font-size: 11px;
              color: #64748b;
              text-align: center;
              line-height: 1.6;
            }
            .badge {
              display: inline-block;
              padding: 4px 10px;
              background-color: ${isFinal ? '#ecfdf5' : '#e0f2fe'};
              color: ${isFinal ? '#047857' : '#0369a1'};
              border: 1px solid ${isFinal ? '#a7f3d0' : '#bae6fd'};
              border-radius: 99px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              margin-top: 8px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <div class="logo">
                <img src="${window.location.origin}/logo-light.png" alt="Print To Frame" style="height: 32px; width: auto; margin-right: 8px;" />
                Print To Frame Pvt Ltd
              </div>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Premium Steel Framing & Gallery Canvas Wraps<br/>Kadawatha, Sri Lanka | +94 71 141 9027</p>
            </div>
            <div class="meta-box">
              <span class="badge">${badgeText}</span>
              <p class="invoice-id" style="margin-top:12px;">${invoiceNo}</p>
              <p>Date: ${dateStr}</p>
            </div>
          </div>

          <div class="bill-to-section">
            <h4 class="section-title">Invoiced Client</h4>
            <div class="bill-to-content">${clientHeader}</div>
            ${formData.phone ? `<p style="margin: 6px 0 0 0; font-size:13px; color:#64748b;">Phone: ${formData.phone}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Description / Specification</th>
                <th style="text-align: center; width: 80px;">Qty</th>
                <th style="text-align: right; width: 150px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsToPrint ? lineItemsToPrint.map(item => `
                <tr>
                  <td>
                    <strong>${item.description || 'Fabrication Item'}</strong>
                    ${item.unit ? `<span style="font-size:11px; color:#64748b; margin-left:6px;">(${item.unit})</span>` : ''}
                  </td>
                  <td style="text-align: center;" class="mono-text">${item.qty || 1}</td>
                  <td style="text-align: right; font-weight: 600;" class="mono-text">LKR ${(Number(item.qty || 1) * Number(item.unitPrice || 0) * (isFinal ? 0.25 : 0.75)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td>
                    <strong>${lineItemTitle}</strong><br/>
                    <span style="font-size: 12px; color: #64748b; margin-top:4px; display:block;">
                      Scope: ${formData.invoiceDraft || formData.jobScope || 'Custom metal framing work'}
                    </span>
                  </td>
                  <td style="text-align: center;" class="mono-text">1</td>
                  <td style="text-align: right; font-weight: 600;" class="mono-text">LKR ${invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `}
            </tbody>
          </table>

          <div class="totals-container">
            <table class="totals-table">
              <tr>
                <td style="color:#64748b;">Contract Value:</td>
                <td style="text-align: right;" class="mono-text">LKR ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="color:#64748b;">${isFinal ? 'Advance Paid (75%):' : 'Balance Due on Delivery:'}</td>
                <td style="text-align: right;" class="mono-text">LKR ${isFinal ? advanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="grand-total">
                <td>${isFinal ? 'Final Settlement Due:' : 'Advance Amount Due:'}</td>
                <td style="text-align: right;" class="mono-text">LKR ${invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>

          <div class="payment-terms">
            <p><strong>Bank Details for Transfer:</strong> Nation Trust Bank - Head Office (500) | A/C: 205001028941 | Madhuka Gamage | Swift: N T B E L K E L K</p>
            <p>Please email payment confirmation slips to billing@print2frame.xyz quoting the Invoice Reference above.</p>
            <p style="margin-top: 15px; font-size: 9px; color: #94a3b8;">Generated automatically on behalf of Print To Frame ERP. Subject to terms of contract.</p>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWin = window.open('', '', 'height=800,width=800');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }
  };

  const saveInvoiceToDb = () => {
    if (!onSaveInvoice) return;
    const invId = `INV-${String(Date.now()).slice(-6)}`;
    const invoiceDate = new Date().toISOString().split('T')[0];
    const totalVal = Number(formData.value || lead.value || 0);
    const activeQuote = (allQuotations || []).find(q => q.leadId === lead.id || q.leadId === lead._firestoreId);
    onSaveInvoice({
      id: invId,
      leadId: lead.id,
      quotationId: activeQuote?._firestoreId || activeQuote?.id || '',
      customerName: formData.name || lead.name || 'Direct Customer',
      company: formData.company || lead.company || '',
      phone: formData.phone || '',
      date: invoiceDate,
      amount: totalVal * 0.75,
      totalValue: totalVal,
      advancePaid: 0,
      balanceDue: totalVal * 0.25,
      type: 'Advance',
      status: formData.invoicePaid ? 'Paid' : 'Unpaid',
      aiDraft: formData.invoiceDraft || formData.jobScope || 'Custom steel framing advance invoice',
      lineItems: activeQuote?.lineItems || [
        { description: formData.jobScope || "Custom steel framing advance deposit", qty: 1, unit: "job", unitPrice: totalVal * 0.75, taxPct: 0, discountPct: 0 }
      ]
    });
    const updatedData = { ...formData, invoiceDate: invoiceDate, invoiceGenerated: true };
    setFormData(updatedData);
    handleSaveLead(updatedData);
    toast.success('75% Advance invoice saved to database!');
  };

  const saveFinalInvoiceToDb = () => {
    if (!onSaveInvoice) return;
    const invId = `FIN-${String(Date.now()).slice(-6)}`;
    const invoiceDate = new Date().toISOString().split('T')[0];
    const totalVal = Number(formData.value || lead.value || 0);
    const activeQuote = (allQuotations || []).find(q => q.leadId === lead.id || q.leadId === lead._firestoreId);
    onSaveInvoice({
      id: invId,
      leadId: lead.id,
      quotationId: activeQuote?._firestoreId || activeQuote?.id || '',
      customerName: formData.name || lead.name || 'Direct Customer',
      company: formData.company || lead.company || '',
      phone: formData.phone || '',
      date: invoiceDate,
      amount: totalVal * 0.25,
      totalValue: totalVal,
      advancePaid: totalVal * 0.75,
      balanceDue: totalVal * 0.25,
      type: 'Final',
      status: 'Unpaid',
      aiDraft: formData.jobScope || 'Custom steel framing 25% final settlement invoice',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      lineItems: activeQuote?.lineItems || [
        { description: formData.jobScope || "Custom steel framing final balance settlement", qty: 1, unit: "job", unitPrice: totalVal * 0.25, taxPct: 0, discountPct: 0 }
      ]
    });
    toast.success('25% Final Settlement invoice saved to database!');
  };

  const handleConvertClick = () => {
    const missing = [];
    if (!formData.name) missing.push('Name');
    if (!formData.phone) missing.push('Phone');
    if (!formData.jobScope) missing.push('Job Scope');
    if (!formData.value) missing.push('Quoted Value');

    if (missing.length > 0) {
      setConvertError(`Missing required fields: ${missing.join(', ')}`);
      return;
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      setConvertError(`Invalid phone format. Please use +947X XXXX XXX`);
      return;
    }

    if (formData.email && !validateEmail(formData.email)) {
      setConvertError(`Invalid email format.`);
      return;
    }

    setConvertError('');
    if (onConvert) {
      onConvert({
        ...lead,
        ...formData
      });
    }
  };

  const handleSaveLead = (extraUpdates = null) => {
    // Prevent React SyntheticEvents from polluting the state
    const updatesToApply = (extraUpdates && !extraUpdates.nativeEvent) ? extraUpdates : formData;

    // If Referral and no Agent selected, warn user
    if (updatesToApply.source === 'Referral' && !updatesToApply.agentId) {
      toast.error('Please assign an agent since the Lead Source is Referral.');
      return;
    }

    if (updatesToApply.phone && !validatePhone(updatesToApply.phone)) {
      toast.error('Invalid phone format. Please use +947X XXXX XXX');
      return;
    }

    if (updatesToApply.email && !validateEmail(updatesToApply.email)) {
      toast.error('Invalid email format.');
      return;
    }

    onSave({
      ...lead,
      ...updatesToApply
    });
    toast.success('Lead details saved');
  };

  const handleClose = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <DetailModalLayout isOpen={true} onClose={handleClose} ariaLabel="Lead and Deal Pipeline Inspector">
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface-container p-6 rounded-2xl shadow-[0_10px_40px_rgba(0,218,243,0.2)] max-w-sm w-full border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-2">Unsaved Changes</h3>
            <p className="text-sm text-on-surface-variant mb-6">You have unsaved changes. Do you want to save before leaving?</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => { setShowCloseConfirm(false); onClose(); }}
                className="flex-1 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-sm rounded-lg transition-colors"
              >
                Discard and Close
              </button>
              <button 
                onClick={() => { setShowCloseConfirm(false); handleSaveLead(); onClose(); }}
                className="flex-1 py-2 bg-primary text-on-primary hover:bg-primary/80 text-on-primary font-bold text-sm rounded-lg transition-colors shadow-[0_0_15px_rgba(0,218,243,0.15)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)]"
              >
                Save and Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Header */}
      <DetailModalHeader
        title={formData.name || 'New Lead'}
        id={lead.id}
        badge={
          <StatusBadge 
            label={lead.stage || 'Draft'} 
            variant="cyan" 
            size="sm" 
          />
        }
        subtitle={
          <>
            <span>Source: <strong className="text-on-surface">{formData.source || 'Manual'}</strong></span>
            <span>•</span>
            <span>Pipeline: <strong className="text-primary">{lead.isDeal ? "Deals" : "Leads"}</strong></span>
          </>
        }
        onClose={handleClose}
      />

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto lg:grid lg:grid-cols-[1fr_420px] custom-scrollbar">
        
        {/* Left Column: Scope, Audio Analyzer, Pricing Engine, Client Details */}
        <DetailModalContent>
            
            {/* Job Requirements & Scope */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center pb-2 border-b border-outline">
                <FileText size={14} className="mr-2 text-primary" />
                Job Requirements & Scope
              </h3>

              <div>
                <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">Scope Details</label>
                <textarea 
                  name="jobScope"
                  value={formData.jobScope}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full p-4 bg-surface-container-highest/60 border border-outline rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Dimensions, wrapping specifications, steel box bar grade..."
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">Delivery Address / Logistics Info</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-3 text-on-surface-variant" />
                  <input 
                    type="text"
                    name="deliveryLocation"
                    value={formData.deliveryLocation}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Provide full location or address"
                  />
                </div>
              </div>
            </div>

            {/* OPTIMIZATION 5: Visual Audio Recording Scope Analyzer */}
            <div className="p-6 bg-error/10 rounded-2xl border border-error/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-error text-on-error rounded-xl">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-on-surface text-xs uppercase tracking-tight">AI Call Recording Analyzer</h3>
                    <p className="text-[10px] text-on-surface-variant font-medium">Extract simple, visual scope drafts from caller recordings</p>
                  </div>
                </div>
                {audioFile && (
                  <button 
                    onClick={resetAudioFile}
                    className="text-[10px] font-bold text-on-surface-variant hover:text-error flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-lg border border-outline transition-colors"
                    title="Change / Remove Audio File"
                  >
                    <RefreshCw size={10} /> Replace File
                  </button>
                )}
              </div>

              <input 
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac"
                onChange={handleAudioFileChange}
                className="hidden"
              />

              {!audioFile ? (
                /* Empty Dropzone State */
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-error/30 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-error/10 hover:border-error/50 transition-all group"
                >
                  <div className="text-center space-y-1.5">
                    <div className="w-10 h-10 rounded-xl bg-error/15 text-error flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Music size={20} />
                    </div>
                    <p className="text-xs font-bold text-on-surface group-hover:text-error transition-colors">Attach telephone call recording</p>
                    <p className="text-[10px] text-on-surface-variant">Supports MP3, WAV, M4A, OGG, AAC up to 25MB • Auto-optimized</p>
                  </div>
                </div>
              ) : (
                /* File Ingestion & Preparation Stage */
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-3">
                  {/* File Info Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-error/15 text-error rounded-lg flex-shrink-0">
                        <Volume2 size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">{audioFile.name}</p>
                        <p className="text-[9px] text-on-surface-variant font-mono">
                          {preparedAudioData?.isCompressed ? (
                            <>
                              Original: {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                              <span className="text-primary font-bold ml-1.5">
                                → Optimized: {preparedAudioData.finalSizeMB} MB (8kHz WAV)
                              </span>
                            </>
                          ) : (
                            <span className="text-emerald-400 font-semibold">
                              {(audioFile.size / 1024 / 1024).toFixed(2)} MB ({preparedAudioData?.formatLabel || 'Audio'} Native Stream)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {uploadStage === 'ready' && (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 size={10} /> Ready
                      </span>
                    )}
                  </div>

                  {/* Upload & Compression Progress Bar */}
                  {uploadStage !== 'ready' && uploadStage !== 'error' && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-on-surface-variant flex items-center gap-1.5">
                          <Loader2 size={10} className="animate-spin text-error" />
                          {uploadStageText}
                        </span>
                        <span className="text-error font-mono">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden border border-outline">
                        <div 
                          className="bg-gradient-to-r from-error to-primary h-full transition-all duration-300 ease-out rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Audio Preview Player */}
                  {uploadStage === 'ready' && audioPreviewUrl && (
                    <div className="pt-1">
                      <p className="text-[9px] uppercase font-bold text-on-surface-variant mb-1 tracking-widest flex items-center gap-1">
                        <Play size={10} /> Call Recording Audio Preview:
                      </p>
                      <audio 
                        controls 
                        src={audioPreviewUrl} 
                        className="w-full h-8 rounded-lg bg-surface-container"
                        preload="metadata"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              {audioFile && !audioAnalysisResult && (
                <button 
                  onClick={analyzeCallRecording}
                  disabled={uploadStage !== 'ready' || isAnalyzingAudio}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 ${
                    isAnalyzingAudio 
                      ? 'bg-error/50 text-on-surface cursor-wait' 
                      : uploadStage !== 'ready'
                        ? 'bg-surface-container text-on-surface-variant border border-outline-variant cursor-not-allowed opacity-60'
                        : 'bg-error text-on-error hover:bg-error/90 shadow-[0_4px_20px_rgba(0,218,243,0.05)] active:scale-[0.98]'
                  }`}
                >
                  {isAnalyzingAudio ? (
                    <>
                      <Loader2 size={14} className="animate-spin mr-1" />
                      <span>{audioAnalysisStage || 'AI is transcribing & analyzing speech...'}</span>
                    </>
                  ) : uploadStage !== 'ready' ? (
                    <>
                      <Loader2 size={12} className="animate-spin mr-1" />
                      <span>Preparing audio file ({uploadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Extract Scope using Gemini AI</span>
                    </>
                  )}
                </button>
              )}

              {audioError && (
                <div className="p-3 bg-error/20 text-error border border-error/30 rounded-xl text-[10px] font-bold flex items-start gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{audioError}</span>
                </div>
              )}

              {audioAnalysisResult && (
                <div className="space-y-3">
                  <label className="block text-xs uppercase font-bold text-on-surface tracking-wider">Visual Scope Analysis</label>
                  <textarea 
                    value={audioAnalysisResult.scope || ''}
                    onChange={(e) => setAudioAnalysisResult({ ...audioAnalysisResult, scope: e.target.value })}
                    rows={6}
                    className="w-full p-4 bg-surface-container border border-error/30 rounded-xl text-xs text-on-surface font-mono focus:outline-none"
                  />
                  <button 
                    onClick={applyAudioAnalysisToScope}
                    className="w-full py-2.5 bg-secondary text-on-secondary hover:bg-secondary/80 rounded-xl font-bold text-xs transition-all active:scale-[0.98]"
                  >
                    Confirm and Set as Job Scope
                  </button>
                </div>
              )}
            </div>

            {/* OPTIMIZATION 4: AI Quote Draft Display */}
            {formData.quotationGenerated && formData.quotationDraft && (
              <div className="space-y-2 flex flex-col flex-1 min-h-[220px]">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase font-bold text-on-surface tracking-wider">Quotation Body Preview</label>
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, quotationDraft: '', quotationGenerated: false }))} 
                    className="text-error hover:text-error p-1.5 bg-error/10 hover:bg-error/20 rounded-md transition-colors flex items-center"
                    title="Erase Draft"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <textarea 
                  name="quotationDraft"
                  value={formData.quotationDraft}
                  onChange={handleInputChange}
                  rows={8}
                  className="w-full flex-1 p-4 bg-surface-container-highest/60 border border-outline rounded-xl text-xs text-on-surface font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="text-[9px] text-secondary font-bold block bg-secondary/10 border border-secondary/30 p-2.5 rounded-lg">
                  ✔ Structured into cost breakdown categories matching the pricing engine.
                </span>
              </div>
            )}

            {/* Advance Invoice section (shown after Intake stage) */}
            {lead.stage !== 'Intake' && (
              <div className="space-y-4 border-t border-outline-variant pt-6">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center">
                  <Printer size={16} className="mr-2 text-secondary" />
                  Advance Invoice (75%)
                </h3>

                <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] space-y-4">
                  <button 
                    onClick={handleGenerateInvoice}
                    disabled={isGeneratingInvoice || (formData.invoiceGenerated && !!formData.invoiceDraft)}
                    className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 ${
                      isGeneratingInvoice
                        ? 'bg-emerald-400 text-on-surface cursor-wait'
                        : formData.invoiceGenerated && formData.invoiceDraft
                          ? 'bg-surface-container text-on-surface-variant border border-outline-variant cursor-not-allowed'
                          : 'bg-secondary text-on-secondary hover:bg-secondary/80 text-on-primary shadow-[0_4px_20px_rgba(0,218,243,0.05)] active:scale-[0.98]'
                    }`}
                  >
                    {isGeneratingInvoice ? 'Drafting Invoice...' : formData.invoiceGenerated ? 'Invoice Draft Ready' : 'AI Generate 75% Invoice'}
                  </button>

                  {invoiceError && (
                    <p className="text-[10px] font-bold text-error uppercase tracking-tight">{invoiceError}</p>
                  )}
                </div>

                {formData.invoiceGenerated && formData.invoiceDraft && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs uppercase font-bold text-on-surface tracking-wider">AI Generated Invoice Details</label>
                      <button 
                        onClick={() => setFormData(prev => ({ ...prev, invoiceDraft: '', invoiceGenerated: false }))} 
                        className="text-error hover:text-error p-1.5 bg-error/10 hover:bg-error/20 rounded-md transition-colors flex items-center"
                        title="Erase Draft"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <textarea 
                      value={formData.invoiceDraft}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoiceDraft: e.target.value }))}
                      rows={6}
                      className="w-full p-4 bg-surface-container-highest/60 border border-outline rounded-xl text-xs text-on-surface font-mono focus:outline-none"
                    />

                    {/* OPTIMIZATION 6: Print redesigned premium PDF and save to Database */}
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={printInvoice}
                        className="py-2.5 bg-surface-container-highest/60 border border-outline text-on-surface hover:bg-surface-container-low hover:text-primary rounded-xl font-bold text-xs shadow-[0_4px_20px_rgba(0,218,243,0.05)] flex items-center justify-center space-x-1"
                      >
                        <Printer size={13} />
                        <span>Print PDF</span>
                      </button>
                      <button 
                        onClick={saveInvoiceToDb}
                        className="py-2.5 bg-secondary/20 text-secondary hover:bg-emerald-200 rounded-xl font-bold text-xs shadow-[0_4px_20px_rgba(0,218,243,0.05)] flex items-center justify-center space-x-1"
                      >
                        <Check size={13} />
                        <span>Save to DB</span>
                      </button>
                      {formData.invoicePaid ? (
                        <div className="py-2.5 bg-green-500 text-on-surface rounded-xl font-bold text-xs shadow-[0_4px_20px_rgba(0,218,243,0.05)] flex items-center justify-center space-x-1 col-span-2">
                          <Check size={13} />
                          <span>Payment Received</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                             const updatedData = { ...formData, invoicePaid: true };
                             setFormData(updatedData);
                             handleSaveLead(updatedData);
                             if (onMarkInvoicePaid) {
                               onMarkInvoicePaid(lead.id);
                             }
                          }}
                          className="py-2.5 bg-primary/10 text-primary hover:bg-blue-200 rounded-xl font-bold text-xs shadow-[0_4px_20px_rgba(0,218,243,0.05)] flex items-center justify-center space-x-1 col-span-2"
                        >
                          <Check size={13} />
                          <span>Mark Paid</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pricing Engine */}
            <div className="p-6 bg-violet-50/50 rounded-2xl border border-violet-100/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-violet-600 text-white rounded-xl">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-on-surface text-xs uppercase tracking-tight">Automated Pricing Engine</h3>
                    <p className="text-[10px] text-on-surface-variant font-medium">Input dimensions to auto-calculate price brackets</p>
                  </div>
                </div>
                {calcSqFt > 0 && activePricing && (
                  <div className="flex items-center space-x-2">
                    {dimensionsLocked && currentUser?.role === 'Admin' && (
                      <button onClick={() => setDimensionsLocked(false)} className="text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded-md hover:bg-violet-200">
                        Unlock Dims
                      </button>
                    )}
                    <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-full text-[10px] font-bold">
                      Tier: {activePricing.tierInfo.range}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">Length (ft)</label>
                  <input 
                    type="number"
                    value={calcLength || ''}
                    onChange={(e) => setCalcLength(Number(e.target.value))}
                    disabled={dimensionsLocked && currentUser?.role !== 'Admin'}
                    className={`w-full px-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${dimensionsLocked && currentUser?.role !== 'Admin' ? 'opacity-60 cursor-not-allowed bg-surface-container-low' : ''}`}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">Height (ft)</label>
                  <input 
                    type="number"
                    value={calcHeight || ''}
                    onChange={(e) => setCalcHeight(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    placeholder="0"
                  />
                </div>
              </div>

              {calcSqFt > 0 && activePricing && (
                <div className="bg-surface-container p-4 rounded-xl border border-violet-100 flex items-center justify-between shadow-inner">
                  <div className="text-left">
                    <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Total area & Rate per SqFt</p>
                    <p className="text-xs font-bold text-on-surface mt-1">
                      {calcSqFt} SQFT @ LKR {activePricing.finalAmountPerSq.toFixed(2)}/SqFt
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-bold text-violet-500 tracking-wider">Discounted Final amount</p>
                    <p className="text-base font-extrabold text-violet-700">LKR {activePricing.finalAmount.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {calcSqFt > 0 && (
                <button 
                  onClick={applyPricingToLead}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-on-surface rounded-xl font-bold text-xs shadow-[0_4px_20px_rgba(0,218,243,0.05)] transition-all active:scale-[0.98]"
                >
                  Apply Calculator Results to Lead Quotation
                </button>
              )}
            </div>

            {/* Client Details Section */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center pb-2 border-b border-outline">
                <User size={14} className="mr-2 text-primary" />
                Client Profile Details
              </h3>

              {/* OPTIMIZATION 2: Inline Cross-Checking autofill prompt */}
              {matchedCustomer && (
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/30 flex items-center justify-between shadow-[0_4px_20px_rgba(0,218,243,0.05)] animate-bounce">
                  <div>
                    <p className="text-xs font-bold text-yellow-500">Existing Customer Found in Database!</p>
                    <p className="text-[10px] text-primary mt-0.5">Matched profile: {matchedCustomer.name} {matchedCustomer.businessName ? `(${matchedCustomer.businessName})` : ''}</p>
                  </div>
                  <button 
                    onClick={autofillCustomerDetails}
                    className="px-3 py-1.5 bg-yellow-500/20 text-yellow-500 text-on-surface hover:bg-yellow-500/20 text-yellow-500 rounded-lg text-[10px] font-bold shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                  >
                    Auto-Fill Profile
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">Contact Number</label>
                  <div className="flex bg-surface-container-highest/60 border border-outline rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50">
                    <div className="flex items-center px-3 bg-surface-container border-r border-outline-variant text-sm font-bold text-on-surface-variant select-none">
                      <Phone size={14} className="mr-1.5 text-on-surface-variant" />
                      +94
                    </div>
                    <input 
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => {
                         handlePhoneChange(e.target.value);
                      }}
                      className="w-full px-3 py-2.5 bg-transparent text-sm focus:outline-none"
                      placeholder="+94 7X XXX XXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">Full Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-3 text-on-surface-variant" />
                    <input 
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. Amal Silva"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">Company / Business</label>
                  <div className="relative">
                    <Building size={14} className="absolute left-3.5 top-3 text-on-surface-variant" />
                    <input 
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. Silva Art Printers"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-3 text-on-surface-variant" />
                    <input 
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="example@test.com"
                    />
                  </div>
                </div>

                {/* OPTIMIZATION 3: Lead Source and Agent Selection triggers */}
                <div>
                  <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">Lead Source</label>
                  <select 
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em] [&>option]:bg-surface-container-high [&>option]:text-on-surface"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300daf3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                  >
                    <option value="Manual">Manual Entry</option>
                    <option value="Referral">Referral (Commission Agent)</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Website">Website</option>
                    <option value="Walk-in">Walk-in</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[9px] uppercase font-bold mb-1.5 tracking-widest ${formData.source === 'Referral' ? 'text-primary' : 'text-on-surface-variant'}`}>
                    Assigned Agent {formData.source === 'Referral' && '— REQUIRED'}
                  </label>
                  <select 
                    name="agentId"
                    value={formData.agentId}
                    onChange={handleInputChange}
                    disabled={formData.source !== 'Referral'}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em] [&>option]:bg-surface-container-high [&>option]:text-on-surface ${
                      formData.source === 'Referral'
                        ? 'bg-surface-container-low border-primary/50 font-bold text-on-surface shadow-[0_0_15px_rgba(0,218,243,0.1)]'
                        : 'bg-surface-container/40 border-outline-variant/60 text-on-surface-variant cursor-not-allowed opacity-60'
                    }`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300daf3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                  >
                    <option value="">Select Agent / Partner...</option>
                    {partners.map(p => (
                      <option key={p.partnerId || p.id} value={p.partnerId || p.id}>
                        {p.name} ({p.partnerId || p.id} - {p.type || 'Partner'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center pb-2 border-b border-outline">
                <FileSpreadsheet size={16} className="mr-2 text-primary" />
                Quotation & Pricing Breakdown
              </h3>

              <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">Total Contract Value (LKR)</label>
                    <input 
                      type="number"
                      name="value"
                      value={formData.value}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-surface-container-highest/60 border border-outline rounded-xl text-base font-extrabold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">Gross Volume (SqFt)</label>
                    <input 
                      type="number"
                      name="totalSqFt"
                      value={formData.totalSqFt}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-surface-container-highest/60 border border-outline rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Structured Quotation Builder */}
                <div className="pt-2 border-t border-outline">
                  <QuotationBuilder
                    lead={{ ...lead, ...formData }}
                    allQuotations={allQuotations}
                    onSaveInvoice={onSaveInvoice}
                    currentUser={currentUser}
                  />
                </div>

                {/* AI Text Quotation Generator fallback */}
                <div className="pt-3 border-t border-outline">
                  <button 
                    onClick={handleGenerateQuote}
                    disabled={isGeneratingQuote || (formData.quotationGenerated && !!formData.quotationDraft)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 ${
                      isGeneratingQuote 
                        ? 'bg-indigo-400 text-on-surface cursor-wait' 
                        : formData.quotationGenerated && formData.quotationDraft
                          ? 'bg-surface-container text-on-surface-variant border border-outline-variant cursor-not-allowed'
                          : 'bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 shadow-[0_4px_20px_rgba(0,218,243,0.05)] active:scale-[0.98]'
                    }`}
                  >
                    <Sparkles size={13} />
                    <span>{isGeneratingQuote ? 'Drafting with Gemini...' : formData.quotationGenerated ? 'AI Text Draft Ready (Below)' : 'AI Draft Formal Quotation Letter'}</span>
                  </button>

                  {quoteError && (
                    <p className="text-[10px] font-bold text-error uppercase tracking-tight mt-2">{quoteError}</p>
                  )}
                </div>
              </div>
            </div>

            {convertError && (
              <div className="p-3 mt-4 bg-error/20 border border-error/30 text-error text-xs rounded-xl font-bold">
                {convertError}
              </div>
            )}

          </DetailModalContent>

          {/* Right Column: Pricing & Quotation Overview */}
          <DetailModalSidebar>
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center pb-2 border-b border-outline">
                <FileSpreadsheet size={16} className="mr-2 text-primary" />
                Quotation Summary
              </h3>

              <div className="p-5 bg-surface-container/50 rounded-2xl border border-outline text-center space-y-3">
                <FileSpreadsheet size={32} className="text-primary/40 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-on-surface">Structured Quotation System</p>
                  <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">
                    Manage itemized Bill of Quantities, 75%/25% payment split, and version history in the main panel. Accepted quotes convert directly to invoices.
                  </p>
                </div>
                {formData.value > 0 && (
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline text-left">
                    <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Current Value</p>
                    <p className="text-sm font-black text-primary font-mono mt-0.5">
                      LKR {Number(formData.value).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Direct Print Quick-Actions */}
                <div className="pt-3 border-t border-outline-variant/30 space-y-2">
                  <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider text-left">Print Documents</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => printInvoice('Advance')}
                      className="w-full py-2 bg-surface-container-highest/60 border border-outline hover:border-amber-400/40 text-on-surface hover:text-amber-400 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Printer size={11} /> 75% Advance
                    </button>
                    <button
                      type="button"
                      onClick={() => printInvoice('Final')}
                      className="w-full py-2 bg-surface-container-highest/60 border border-outline hover:border-emerald-400/40 text-on-surface hover:text-emerald-400 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Printer size={11} /> 25% Final
                    </button>
                  </div>
                </div>

                {/* Logistics Delivery Dispatch Card for Deals */}
                {(isDeal || lead.isDeal) && (
                  <div className="pt-3 border-t border-outline-variant/30 space-y-2 text-left">
                    <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider flex items-center gap-1">
                      <Truck size={12} className="text-primary" /> Delivery Logistics
                    </p>
                    {(() => {
                      const dealJob = (logisticsJobs || []).find(j => j.dealId === lead.id || j.leadId === lead.id || j.leadId === lead.originalLeadId);
                      if (dealJob) {
                        return (
                          <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[9px] font-bold text-on-surface-variant">{dealJob.id}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                dealJob.status === 'Completed' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                                dealJob.status === 'In Transit' ? 'text-primary bg-primary/10 border-primary/30 animate-pulse' :
                                'text-amber-400 bg-amber-500/10 border-amber-500/30'
                              }`}>
                                {dealJob.status === 'Completed' ? 'Delivered' : dealJob.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-on-surface truncate">📍 {dealJob.location || formData.deliveryLocation || 'Customer address'}</p>
                            {dealJob.driver && (
                              <p className="text-[9px] text-on-surface-variant font-medium">Driver: <strong>{dealJob.driver}</strong></p>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-2">
                          <p className="text-[10px] text-on-surface-variant leading-tight">
                            Dispatch completed frames to: <strong className="text-on-surface">{formData.deliveryLocation || 'Destination TBD'}</strong>
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (onCreateLogistics) {
                                onCreateLogistics({ ...lead, ...formData });
                              }
                            }}
                            className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                          >
                            <Truck size={13} />
                            <span>Dispatch Delivery</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </DetailModalSidebar>

        </div>

      {/* Universal Footer */}
      <DetailModalFooter
        secondaryActions={
          !lead.isDeal && !isDeal && !lead.convertedToDeal ? (
            <button 
              type="button"
              onClick={handleConvertClick}
              className="px-4 py-2 bg-secondary text-on-secondary hover:bg-secondary/90 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
            >
              <Check size={14} />
              <span>Convert to Deal</span>
            </button>
          ) : null
        }
        onClose={handleClose}
        closeText="Cancel"
        primaryActions={
          <button 
            type="button"
            onClick={() => {
              handleSaveLead(formData);
              onClose(); 
            }}
            className="px-6 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all flex items-center space-x-1.5 shadow-[0_0_15px_rgba(0,218,243,0.2)] active:scale-95"
          >
            <Save size={14} />
            <span>{isDeal || lead.isDeal ? 'Save Deal Details' : 'Save Lead Details'}</span>
          </button>
        }
      />

    </DetailModalLayout>
  );
}

