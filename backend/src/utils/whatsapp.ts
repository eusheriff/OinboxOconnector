/**
 * Formata um número de telefone para o formato WhatsApp JID.
 * Remove caracteres não numéricos e adiciona o sufixo @s.whatsapp.net.
 * Se o número já contiver o sufixo, não o adiciona novamente.
 */
export function formatWhatsAppJid(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.includes('@s.whatsapp.net')) {
    return cleaned;
  }
  return cleaned + '@s.whatsapp.net';
}
