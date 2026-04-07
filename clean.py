import shutil, os
try: os.remove('middleware.ts')
except: pass
try: os.remove('dictionaries/es.json')
except: pass
try: shutil.rmtree('app/[lang]')
except: pass
