/**
 * Utility to translate text using the free MyMemory Translation API.
 * This is a lightweight alternative when no Google Translate API key is available.
 */

export async function translateText(text: string, targetLanguage: string, sourceLanguage: string = 'en'): Promise<string> {
    if (!text || !targetLanguage || targetLanguage === sourceLanguage) return text;

    try {
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLanguage}|${targetLanguage}`
        );

        if (!response.ok) throw new Error('Translation request failed');

        const data = await response.json();
        
        if (data.responseStatus === 200) {
            return data.responseData.translatedText;
        }

        return text; // Fallback to original text if API fails
    } catch (error) {
        console.error('Translation Error:', error);
        return text;
    }
}
