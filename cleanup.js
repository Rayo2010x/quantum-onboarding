const fs = require('fs');
try { fs.unlinkSync('middleware.ts'); console.log('middleware deleted'); } catch (e) {}
try { fs.unlinkSync('dictionaries/es.json'); console.log('es deleted'); } catch (e) {}
try { fs.rmSync('app/[lang]', { recursive: true, force: true }); console.log('lang deleted'); } catch (e) {}
