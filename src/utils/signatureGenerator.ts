import type { CardData } from '../types';

export function generateSignatureHTML(data: CardData, cardUrl?: string): string {
    const { fullName, jobTitle, company, phoneNumbers, socialLinks, themeColor } = data;

    // Helper to get icon URL (using a reliable public CDN for standard icons or inline base64 if needed, 
    // but for email signatures, hosted images are better. For now, we'll use text labels or simplified structure 
    // to avoid broken images if external hosting isn't set up. 
    // Actually, let's use a clean text-based layout with colored borders to be safe and professional, 
    // as icons often get blocked in emails.)

    // We will use a border-left style which is very common and clean.

    const primaryColor = themeColor || '#000000';
    const textCol = '#333333'; // Standard dark gray for better readability than pure black
    const linkColor = primaryColor;

    let contactRows = '';

    // Phone Numbers
    if (phoneNumbers && phoneNumbers.length > 0) {
        phoneNumbers.forEach(p => {
            contactRows += `
                <tr style="margin: 0; padding: 0;">
                    <td style="padding: 2px 0; color: ${textCol}; font-family: Arial, sans-serif; font-size: 13px;">
                        <span style="font-weight: bold; color: ${textCol};">${p.label}:</span> 
                        <a href="tel:${p.number}" style="color: ${textCol}; text-decoration: none;">${p.number}</a>
                    </td>
                </tr>
            `;
        });
    }

    // Email (find first email in social links)
    const emailLink = socialLinks?.find(l => l.platform === 'email');
    if (emailLink) {
        const email = emailLink.url.replace('mailto:', '');
        contactRows += `
            <tr style="margin: 0; padding: 0;">
                <td style="padding: 2px 0; color: ${textCol}; font-family: Arial, sans-serif; font-size: 13px;">
                    <span style="font-weight: bold; color: ${textCol};">Email:</span> 
                    <a href="${emailLink.url}" style="color: ${linkColor}; text-decoration: none;">${email}</a>
                </td>
            </tr>
        `;
    }

    // Website (find first website in social links)
    const websiteLink = socialLinks?.find(l => l.platform === 'website');
    if (websiteLink) {
        contactRows += `
            <tr style="margin: 0; padding: 0;">
                <td style="padding: 2px 0; color: ${textCol}; font-family: Arial, sans-serif; font-size: 13px;">
                    <span style="font-weight: bold; color: ${textCol};">Web:</span> 
                    <a href="${websiteLink.url}" style="color: ${linkColor}; text-decoration: none;">${websiteLink.url.replace(/^https?:\/\//, '')}</a>
                </td>
            </tr>
        `;
    }

    // Social Links (Text based for safety)
    let socialIcons = '';
    const significantLinks = socialLinks?.filter(l => ['linkedin', 'twitter', 'instagram', 'facebook'].includes(l.platform));

    if (significantLinks && significantLinks.length > 0) {
        socialIcons = `
            <tr style="margin: 0; padding: 0;">
                <td style="padding: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 12px;">
                    ${significantLinks.map(l => {
            const label = l.platform.charAt(0).toUpperCase() + l.platform.slice(1);
            return `<a href="${l.url}" style="color: ${linkColor}; text-decoration: none; margin-right: 10px;">${label}</a>`;
        }).join(' | ')}
                </td>
            </tr>
        `;
    }

    // View My Card Link
    let viewCardRow = '';
    if (cardUrl) {
        viewCardRow = `
            <tr style="margin: 0; padding: 0;">
                <td style="padding: 12px 0 0 0; color: ${textCol}; font-family: Arial, sans-serif; font-size: 13px;">
                    <a href="${cardUrl}" style="background-color: ${primaryColor}; color: #ffffff; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View My Digital Card</a>
                </td>
            </tr>
        `;
    }

    return `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4; color: ${textCol};">
    <tr>
        <td style="padding-right: 15px; border-right: 2px solid ${primaryColor}; vertical-align: top; width: 45%;">
            <div style="font-weight: bold; font-size: 16px; color: ${textCol}; margin-bottom: 2px;">${fullName || 'Your Name'}</div>
            <div style="font-size: 14px; color: ${primaryColor}; margin-bottom: 2px;">${jobTitle || 'Job Title'}</div>
            <div style="font-size: 13px; color: ${textCol}; opacity: 0.8;">${company || 'Company Name'}</div>
        </td>
        <td style="padding-left: 15px; vertical-align: top;">
            <table cellpadding="0" cellspacing="0" border="0">
                ${contactRows}
                ${socialIcons}
                ${viewCardRow}
            </table>
        </td>
    </tr>
    ${cardUrl ? `<tr><td colspan="2" style="font-size: 0; line-height: 0; height: 0;"><!-- Link ensures visibility --></td></tr>` : ''}
</table>
`;
}
