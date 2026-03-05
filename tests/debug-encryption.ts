import { encryptNote, decryptNote } from '../src/crypto/encryption';

const content = 'Secret note content';
const password = 'notepassword';

console.log('Testing encryptNote and decryptNote...');
console.log('Content:', content);
console.log('Password:', password);

try {
  const encrypted = encryptNote(content, password);
  console.log('Encrypted successfully');
  console.log('Salt length:', encrypted.salt.length);
  console.log('Encrypted content length:', encrypted.encryptedContent.length);

  const decrypted = decryptNote(encrypted.encryptedContent, password, encrypted.salt);
  console.log('Decrypted:', decrypted);
  console.log('Match:', decrypted === content);
} catch (error) {
  console.error('Error:', error);
}
