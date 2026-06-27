import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '@clerk/clerk-react';
import { Loader2, ShieldCheck, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface VerificationResult {
  valid: boolean;
  status: string;
  membership?: {
    memberName: string;
    memberPhoto?: string;
    membershipNumber: string;
    membershipType: string;
    expiresAt: string;
  };
  club?: {
    name: string;
  };
}

export function AdminScan() {
  const { getToken } = useAuth();
  const [scanResult, setScanResult] = useState<VerificationResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and clean up scanner
  useEffect(() => {
    // Only initialize once on mount
    const html5Qrcode = new Html5Qrcode('qr-reader-target');
    qrScannerRef.current = html5Qrcode;

    startScanner();

    return () => {
      stopScanner();
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    };
  }, []);

  const startScanner = async () => {
    if (!qrScannerRef.current) return;

    try {
      setIsScanning(true);
      setErrorText(null);

      // Start scanning with environment-facing camera
      await qrScannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          }
        },
        async (decodedText) => {
          // Extract slug from URL: e.g. https://domain.com/membership/slug
          const match = decodedText.match(/\/membership\/([^/?#]+)/);
          if (match && match[1]) {
            const slug = match[1];
            await verifyMembership(slug);
          } else {
            // Not a membership URL
            setErrorText('Invalid QR Code: Not a membership pass URL');
            if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
            overlayTimeoutRef.current = setTimeout(() => setErrorText(null), 3000);
          }
        },
        () => {
          // Silent scan failure/seeking
        }
      );
      setCameraPermissionGranted(true);
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      setIsScanning(false);
      if (err.toString().includes('NotAllowedError')) {
        setCameraPermissionGranted(false);
      } else {
        setErrorText(err.message || 'Failed to access camera.');
      }
    }
  };

  const stopScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const verifyMembership = async (slug: string) => {
    // Pause scanning while showing the result overlay
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.pause();
      } catch (e) {
        console.error('Failed to pause scanner:', e);
      }
    }

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`/api/membership?action=verify&slug=${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ slug })
      });

      const result = await res.json();
      if (res.ok) {
        setScanResult(result);
      } else {
        setScanResult({
          valid: false,
          status: 'error',
          membership: undefined
        });
        setErrorText(result.error || 'Verification request failed');
      }
    } catch (err: any) {
      console.error(err);
      setScanResult({
        valid: false,
        status: 'error'
      });
      setErrorText(err.message || 'An error occurred during verification.');
    }

    // Automatically resume scanning after 3.5 seconds
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    overlayTimeoutRef.current = setTimeout(() => {
      resumeScanning();
    }, 3500);
  };

  const resumeScanning = () => {
    setScanResult(null);
    setErrorText(null);
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.resume();
      } catch (e) {
        console.error('Failed to resume scanner:', e);
        // Fallback: start scanner fresh
        startScanner();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            PASS SCANNER
          </h1>
          <p className="text-xs text-slate-400 font-medium">Real-time QR entry validation</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isScanning ? 'Live' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Viewfinder Container */}
      <div className="w-full max-w-md aspect-square bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden relative shadow-2xl flex flex-col justify-center items-center">
        {/* html5-qrcode target element */}
        <div id="qr-reader-target" className="w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

        {/* Viewfinder guides */}
        {isScanning && !scanResult && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-2/3 h-2/3 border-2 border-dashed border-blue-500/60 rounded-3xl relative animate-pulse">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
              
              {/* Scan laser line animation */}
              <div className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-md shadow-blue-500/50 top-1/2 -translate-y-1/2 animate-[bounce_2s_infinite]" />
            </div>
          </div>
        )}

        {/* Permissions / Status overlay */}
        {cameraPermissionGranted === false && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-bold mb-2">Camera Access Blocked</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Please allow camera permissions in your browser settings to scan passes.
            </p>
            <button
              onClick={startScanner}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Retry Access
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {!isScanning && cameraPermissionGranted === null && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 z-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Initializing Camera...
            </span>
          </div>
        )}

        {/* Result Overlay */}
        {scanResult && (
          <div 
            className={`absolute inset-0 flex flex-col items-center justify-center p-6 z-30 animate-in fade-in zoom-in-95 duration-200 ${
              scanResult.valid ? 'bg-emerald-950/95' : 'bg-red-950/95'
            }`}
          >
            {scanResult.valid ? (
              <CheckCircle className="w-20 h-20 text-emerald-400 mb-4 animate-bounce" />
            ) : (
              <XCircle className="w-20 h-20 text-red-500 mb-4" />
            )}

            <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
              {scanResult.valid ? 'Access Granted' : 'Access Denied'}
            </h2>
            
            <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-6 ${
              scanResult.valid ? 'bg-emerald-800 text-emerald-100' : 'bg-red-900 text-red-100'
            }`}>
              {scanResult.status}
            </span>

            {scanResult.membership && (
              <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl w-full max-w-xs flex flex-col items-center gap-3 backdrop-blur-xl">
                <div className="w-14 h-14 rounded-full border border-white/20 overflow-hidden bg-white/5 flex-shrink-0">
                  {scanResult.membership.memberPhoto ? (
                    <img src={scanResult.membership.memberPhoto} alt="Member" className="w-full h-full object-cover" />
                  ) : (
                    <ShieldCheck className="w-full h-full p-2 text-slate-500" />
                  )}
                </div>
                <div className="text-center">
                  <h3 className="font-extrabold text-sm">{scanResult.membership.memberName}</h3>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">
                    {scanResult.membership.membershipType} Tier
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    ID: {scanResult.membership.membershipNumber}
                  </span>
                </div>
                <div className="w-full border-t border-white/5 pt-2 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Expires On</span>
                  <span className="text-[11px] font-semibold text-slate-300">
                    {new Date(scanResult.membership.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            {scanResult.club && (
              <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-4">
                {scanResult.club.name}
              </span>
            )}

            <button
              onClick={resumeScanning}
              className="mt-6 px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/10"
            >
              Scan Next
            </button>
          </div>
        )}
      </div>

      {/* Helper text / error banner */}
      {errorText && (
        <div className="w-full max-w-md mt-4 p-3 bg-red-950/40 border border-red-500/20 rounded-2xl flex items-center gap-2 text-red-400 text-xs font-medium animate-in slide-in-from-bottom-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {/* Instruction block */}
      <div className="w-full max-w-md mt-6 p-4 bg-slate-900 border border-slate-800 rounded-[24px]">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Instructions</h4>
        <ul className="text-[11px] text-slate-400 space-y-2 list-disc list-inside">
          <li>Point the viewfinder directly at the QR code on the member's wallet pass.</li>
          <li>Ensure the QR code is centered and clearly lit.</li>
          <li>The system will decode, verify status, and log the check-in automatically.</li>
        </ul>
      </div>
    </div>
  );
}
