from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
import cryptography.hazmat.primitives.serialization as serialization
from cryptography.hazmat.backends import default_backend

import binascii

ciphertext64="OYntLRIPmPi7vbJlusiA9NqzIFEHBaNoVHtQBjwOLd/H2SEKQwW3jvDpCTRbh0LOlT7dC8YfabFvWe4olvguph4DBma9gjiA/XqRUSOCQnJY6DXnu183hH2Eqs/ibEhhunYOlNHu8FIeRLjivs5PVumXwmx03PIvDEgA09ktTkAf8ZCab0Bc8p3SQF2nMFVG3P4mZUzr2/374qAtnxss6cZfu0evDod8cJ3RyymiFVrYe2CNFFUQJmTwRow9z8PITy1voiNZiDC/RH1KW6szmvQqKEG9NzNPuyhQm89xmLL0Jc/8ALrwZaCSN2qaK4tq3Pss/MQbO8umAyrW7zq8Qg=="

ciphertext = bytes(binascii.a2b_base64(ciphertext64))

print(list(ciphertext))

with open("privkey.pem", "rb") as key_file:
	private_key = serialization.load_pem_private_key(
		key_file.read(),
		password=None,
		backend=default_backend()
	)
	
plaintext = private_key.decrypt(
	ciphertext,
	padding.OAEP(
		mgf=padding.MGF1(algorithm=hashes.SHA1()),
		algorithm=hashes.SHA1(),
		label=None
	)
)
	
	
print(plaintext)
