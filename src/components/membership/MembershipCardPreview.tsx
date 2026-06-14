import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { type MembershipCardConfig } from '../../types/membershipTypes.js';

interface MembershipCardPreviewProps {
  clubName: string;
  clubLogoUrl?: string;
  cardConfig: MembershipCardConfig;
  memberName: string;
  memberEmail: string;
  memberPhoto?: string;
  membershipNumber: string;
  membershipType: string;
  stripImageUrl?: string;
  expiresAt?: Date | string;
  isFlipped?: boolean;
  isPreview?: boolean;
  memberSince?: number | string;
}

export function MembershipCardPreview({
  clubName,
  clubLogoUrl,
  cardConfig,
  memberName,
  memberEmail,
  memberPhoto,
  membershipNumber,
  membershipType,
  stripImageUrl,
  expiresAt,
  isFlipped = false,
  isPreview = false,
  memberSince,
}: MembershipCardPreviewProps) {
  const showStrip = cardConfig.showMemberPhoto || cardConfig.showMemberName;
  const logoUrl = clubLogoUrl;

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  return (
    <div
      className={`
        ${isPreview ? 'w-full h-full' : 'w-[320px] h-[480px] bg-gray-900/5 backdrop-blur-sm rounded-[40px] p-4 shadow-2xl border border-white/20'} 
        flex flex-col items-center justify-center relative [preserve-perspective:1000px]
      `}
      style={{ fontFamily: cardConfig.fontFamily || 'Inter, sans-serif' }}
    >
      {/* 3D Flip Container */}
      <motion.div
        className="w-full h-[400px] relative transition-all duration-700 [transform-style:preserve-3d]"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* FRONT OF CARD */}
        <div
          className={`${isPreview ? 'rounded-xl' : 'rounded-[18px] shadow-xl'} absolute inset-0 w-full h-full overflow-hidden flex flex-col [backface-visibility:hidden]`}
          style={{ backgroundColor: cardConfig.walletBackgroundColor || '#ffffff' }}
        >
          {/* Top Section / Header */}
          <div className="px-4 py-3 flex justify-between items-center z-10 w-full">
            <div className="flex items-center gap-2">
              {cardConfig.showClubLogo !== false && logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain rounded-full" />
              )}
              {cardConfig.showClubName !== false && (
                <span
                  className="text-[10px] font-bold tracking-tight uppercase"
                  style={{ color: cardConfig.walletForegroundColor || '#000000' }}
                >
                  {clubName || 'CLUB NAME'}
                </span>
              )}
            </div>
            {/* Header Field (Member Since) */}
            <div className="text-right flex flex-col">
              <span 
                className="text-[7px] font-bold uppercase tracking-wider opacity-70"
                style={{ color: cardConfig.walletLabelColor || '#666666' }}
              >
                MEMBER SINCE
              </span>
              <span 
                className="text-[10px] font-extrabold leading-none"
                style={{ color: cardConfig.walletForegroundColor || '#000000' }}
              >
                {memberSince || new Date().getFullYear()}
              </span>
            </div>
          </div>

          {/* Strip Image Area */}
          {showStrip ? (
            <div className="w-full aspect-[1125/369] relative bg-gray-100 flex items-center justify-center overflow-hidden">
              {stripImageUrl ? (
                <img
                  src={stripImageUrl}
                  alt="Strip"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center px-4 relative"
                  style={{
                    backgroundColor: cardConfig.stripConfig?.bgType === 'color' 
                      ? cardConfig.stripConfig.bgColor 
                      : '#e5e7eb',
                    backgroundImage: (cardConfig.stripConfig?.bgType === 'image' && cardConfig.stripConfig.bgImageUrl)
                      ? `url(${cardConfig.stripConfig.bgImageUrl})`
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Faux Render if Strip Image is generating */}
                  <div className="flex items-center gap-3 z-10 w-full">
                    {cardConfig.showMemberPhoto && (
                      <div className="w-14 h-14 rounded-full border-2 border-white overflow-hidden bg-gray-300 flex-shrink-0 flex items-center justify-center">
                        {memberPhoto ? (
                          <img src={memberPhoto} alt="Member" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-500 text-[10px]">Photo</span>
                        )}
                      </div>
                    )}
                    {cardConfig.showMemberName && (
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-white drop-shadow-md">
                          {memberName || 'Member Name'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Minimalist Layout if no Strip */
            <div className="px-4 py-8 z-10 flex-grow flex flex-col justify-center text-left">
              {cardConfig.showMemberName && (
                <>
                  <span
                    className="text-[10px] font-medium opacity-60 uppercase"
                    style={{ color: cardConfig.walletLabelColor || '#666' }}
                  >
                    MEMBER NAME
                  </span>
                  <span
                    className="text-2xl font-black tracking-tight leading-none mb-1"
                    style={{ color: cardConfig.walletForegroundColor || '#000' }}
                  >
                    {memberName || 'Member Name'}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Secondary fields (Membership Type & Number) */}
          <div className="px-4 py-4 grid grid-cols-2 gap-y-4 gap-x-2 flex-grow text-left">
            {cardConfig.showMembershipType !== false && (
              <div>
                <span
                  className="block text-[8px] font-bold opacity-70 uppercase tracking-widest"
                  style={{ color: cardConfig.walletLabelColor || '#666' }}
                >
                  MEMBERSHIP TYPE
                </span>
                <span
                  className="block text-xs font-bold"
                  style={{ color: cardConfig.walletForegroundColor || '#000' }}
                >
                  {membershipType || 'Gold'}
                </span>
              </div>
            )}
            {cardConfig.showMembershipNumber !== false && (
              <div>
                <span
                  className="block text-[8px] font-bold opacity-70 uppercase tracking-widest"
                  style={{ color: cardConfig.walletLabelColor || '#666' }}
                >
                  MEMBER NUMBER
                </span>
                <span
                  className="block text-xs font-bold"
                  style={{ color: cardConfig.walletForegroundColor || '#000' }}
                >
                  {membershipNumber || '001'}
                </span>
              </div>
            )}
          </div>

          {/* Barcode/QR Code Section */}
          <div className="bg-white p-4 flex items-center justify-center border-t border-gray-100 mt-auto">
            <div className="w-24 h-24 border border-gray-100 flex items-center justify-center p-2 rounded-lg bg-white">
              <QRCodeSVG
                value={`https://reallysimple-membership.vercel.app/membership/${membershipNumber}`}
                size={80}
                level="M"
              />
            </div>
          </div>
        </div>

        {/* BACK OF CARD */}
        <div
          className={`${isPreview ? 'rounded-xl' : 'rounded-[18px] shadow-xl'} absolute inset-0 w-full h-full overflow-hidden flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)]`}
          style={{ backgroundColor: cardConfig.walletBackgroundColor || '#ffffff' }}
        >
          <div className="p-6 space-y-6 flex-grow overflow-y-auto text-left">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Membership Info
              </h4>

              <div className="space-y-1">
                <span
                  className="text-[8px] font-bold opacity-50 uppercase tracking-wider"
                  style={{ color: cardConfig.walletLabelColor || '#666' }}
                >
                  Member Name
                </span>
                <p
                  className="text-[11px] font-medium"
                  style={{ color: cardConfig.walletForegroundColor || '#000' }}
                >
                  {memberName || 'Your Name'}
                </p>
              </div>

              <div className="space-y-1">
                <span
                  className="text-[8px] font-bold opacity-50 uppercase tracking-wider"
                  style={{ color: cardConfig.walletLabelColor || '#666' }}
                >
                  Email Address
                </span>
                <p
                  className="text-[11px] font-medium"
                  style={{ color: cardConfig.walletForegroundColor || '#000' }}
                >
                  {memberEmail || 'member@example.com'}
                </p>
              </div>

              <div className="space-y-1">
                <span
                  className="text-[8px] font-bold opacity-50 uppercase tracking-wider"
                  style={{ color: cardConfig.walletLabelColor || '#666' }}
                >
                  Membership Number
                </span>
                <p
                  className="text-[11px] font-medium"
                  style={{ color: cardConfig.walletForegroundColor || '#000' }}
                >
                  {membershipNumber || '001'}
                </p>
              </div>

              <div className="space-y-1">
                <span
                  className="text-[8px] font-bold opacity-50 uppercase tracking-wider"
                  style={{ color: cardConfig.walletLabelColor || '#666' }}
                >
                  Membership Expiration
                </span>
                <p
                  className="text-[11px] font-medium"
                  style={{ color: cardConfig.walletForegroundColor || '#000' }}
                >
                  {formattedExpiry}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex items-center justify-center bg-gray-50/50 mt-auto">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
              Automatically Managed by {clubName || 'Club'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Helper visual layer for layout perspective */}
      {!isPreview && (
        <>
          <div className="absolute top-[320px] left-8 right-8 h-[200px] bg-white/40 backdrop-blur-md rounded-t-[18px] -z-10 translate-y-12 rotate-[-2deg] border border-white/20" />
          <p className="absolute bottom-6 text-[10px] text-gray-400 font-medium">
            Live Wallet Pass Preview (Tap to Flip)
          </p>
        </>
      )}
    </div>
  );
}
