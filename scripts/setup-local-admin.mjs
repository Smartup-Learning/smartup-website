import {writeFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(existsSync('.env'))console.log('Existing local configuration preserved.');
else {writeFileSync('.env',`ADMIN_PASSWORD=${randomBytes(24).toString('base64url')}\nDATA_DIR=data\n`,{mode:0o600});console.log('Local admin password saved in .env (not committed).');}
