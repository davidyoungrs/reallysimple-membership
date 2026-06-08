import { type StripConfig } from '../types.js';

export interface ClubBrandingConfig {
  primaryColor: string;      // Main accent
  secondaryColor: string;    // Secondary accent
  textColor: string;         // Default text
  backgroundColor: string;   // Page/card background
  fontFamily: string;        // Google Font name
}

export interface MembershipCardConfig {
  // Wallet pass colours
  walletBackgroundColor: string;
  walletForegroundColor: string;
  walletLabelColor: string;
  // Strip image template config
  stripConfig: StripConfig;
  // Layout flags
  showMemberPhoto: boolean;
  showMemberName: boolean;
  showMembershipType: boolean;
  showMembershipNumber: boolean;
  showClubLogo: boolean;
  showClubName: boolean;
  // Fonts
  fontFamily: string;
}

export interface MembershipRecord {
  id: number;
  uid: string;
  templateId: number;
  clubId: number;
  memberName: string;
  memberEmail: string;
  memberPhoto?: string;
  membershipNumber: string;
  membershipType: string;
  stripImageUrl?: string;
  cardConfig: MembershipCardConfig;
  slug: string;
  status: 'active' | 'expired' | 'revoked';
  issuedAt: Date;
  expiresAt: Date;
  issuedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
