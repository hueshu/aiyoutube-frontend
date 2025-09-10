// Helper function to detect and convert text encoding
export async function detectAndConvertEncoding(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  
  // First try to read as UTF-8
  const utf8Decoder = new TextDecoder('utf-8');
  const utf8Text = utf8Decoder.decode(buffer);
  
  // Check if the text contains common Chinese garbled patterns
  const garbledPatterns = [
    /[\u00c0-\u00ff][\u0080-\u00bf]/,  // Common garbled pattern
    /[ÃÂ¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿]/,  // Typical GBK garbled chars
    /�/,  // Replacement character
  ];
  
  const hasGarbled = garbledPatterns.some(pattern => pattern.test(utf8Text));
  
  if (!hasGarbled) {
    console.log('File appears to be UTF-8');
    return utf8Text;
  }
  
  console.log('Detected garbled text, attempting GBK conversion...');
  
  // Try to decode as GBK
  try {
    const gbkDecoder = new TextDecoder('gbk');
    const gbkText = gbkDecoder.decode(buffer);
    if (!gbkText.includes('�')) {
      console.log('Successfully decoded as GBK');
      return gbkText;
    }
  } catch (e) {
    console.error('GBK decoding not supported:', e);
  }
  
  // Try GB18030
  try {
    const gb18030Decoder = new TextDecoder('gb18030');
    const gb18030Text = gb18030Decoder.decode(buffer);
    if (!gb18030Text.includes('�')) {
      console.log('Successfully decoded as GB18030');
      return gb18030Text;
    }
  } catch (e) {
    console.error('GB18030 decoding not supported:', e);
  }
  
  // Try GB2312
  try {
    const gb2312Decoder = new TextDecoder('gb2312');
    const gb2312Text = gb2312Decoder.decode(buffer);
    if (!gb2312Text.includes('�')) {
      console.log('Successfully decoded as GB2312');
      return gb2312Text;
    }
  } catch (e) {
    console.error('GB2312 decoding not supported:', e);
  }
  
  // Return original UTF-8 text
  console.log('Using UTF-8 with potential garbled text');
  return utf8Text;
}


// Validate CSV format
export function validateCSV(content: string): boolean {
  const lines = content.trim().split('\n').filter(line => line.trim());
  if (lines.length === 0) return false;
  
  // Skip header if it exists
  let startIndex = 0;
  if (lines[0] && (
    lines[0].includes('序号') || 
    lines[0].includes('分镜') || 
    lines[0].toLowerCase().includes('scene') ||
    lines[0].includes('描述')
  )) {
    startIndex = 1;
  }
  
  // Need at least one data row
  if (lines.length <= startIndex) return false;
  
  // Check if data rows have at least one comma
  let validRows = 0;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Should have at least one comma (for sequence and prompt)
    if (line.includes(',')) {
      validRows++;
    }
  }
  
  // At least one valid row
  return validRows > 0;
}