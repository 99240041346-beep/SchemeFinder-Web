from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import json, os, re

ROOT=os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ROOT,'data','schemes.json'),encoding='utf8') as f:
    DATA=json.load(f)

def match(p):
    out=[]
    for s in DATA:
        checks=[]; reasons=[]
        def check(ok,label):
            checks.append(bool(ok)); reasons.append(label if ok else label.replace('matches','does not match'))
        if s.get('minAge') is not None: check(float(p.get('age',0))>=s['minAge'],'Age condition matches')
        if s.get('maxAge') is not None: check(float(p.get('age',0))<=s['maxAge'],'Age range matches')
        if s.get('incomeLimit') is not None: check(float(p.get('income',0))<=s['incomeLimit'],'Income condition matches')
        if s.get('occupations'): check(p.get('occupation') in s['occupations'],'Occupation matches')
        if s.get('genders'): check(p.get('gender') in s['genders'],'Gender condition matches')
        if s.get('categories'): check(p.get('category') in s['categories'],'Social category matches')
        if s.get('education'): check(p.get('education') in s['education'],'Education condition matches')
        if p.get('state') and s.get('states'): check(p.get('state') in s['states'],'State condition matches')
        score=round(sum(checks)/len(checks)*100) if checks else 100
        if score>=50:
            out.append({**s,'score':score,'status':'matched' if score==100 else 'potential','reasons':reasons,
                        'checks':[{'label':r,'ok':checks[i]} for i,r in enumerate(reasons)]})
    return sorted(out,key=lambda x:(x['score'],x['name']),reverse=True)

def parse_profile(text):
    t=text.lower(); p={}
    age=re.search(r'\b(\d{1,3})\s*(?:years?|yrs?)\b',t)
    if age: p['age']=int(age.group(1))
    states={'tamil nadu':'Tamil Nadu','andhra pradesh':'Andhra Pradesh','telangana':'Telangana','karnataka':'Karnataka','kerala':'Kerala','maharashtra':'Maharashtra','delhi':'Delhi'}
    for k,v in states.items():
        if k in t: p['state']=v; break
    occ={'student':'Student','farmer':'Farmer','agricultural worker':'Agricultural Worker','employee':'Employee','self-employed':'Self-employed','entrepreneur':'Entrepreneur','unemployed':'Unemployed','senior citizen':'Senior Citizen','worker':'Worker'}
    for k,v in occ.items():
        if k in t: p['occupation']=v; break
    edu={'b.tech':'Undergraduate','btech':'Undergraduate','undergraduate':'Undergraduate','postgraduate':'Postgraduate','diploma':'Diploma','school':'School'}
    for k,v in edu.items():
        if k in t: p['education']=v; break
    cats={'ews':'EWS','sc':'SC','st':'ST','obc':'OBC','general':'General'}
    for k,v in cats.items():
        if re.search(r'\b'+re.escape(k)+r'\b',t): p['category']=v; break
    money=re.search(r'(?:income|salary|earnings|annual family income)[^\d]{0,20}(?:₹|rs\.?|inr\s*)?\s*([\d,.]+)\s*(lakh|lakhs|k|thousand|crore|crores)?',t) or re.search(r'(?:₹|rs\.?|inr\s*)\s*([\d,.]+)\s*(lakh|lakhs|k|thousand|crore|crores)?',t)
    if money:
        try:
            n=float(money.group(1).replace(',','')); unit=(money.group(2) or '').lower()
            if 'lakh' in unit: n*=100000
            elif unit in ('k','thousand'): n*=1000
            elif 'crore' in unit: n*=10000000
            p['income']=int(n)
        except: pass
    if 'female' in t or 'woman' in t or 'women' in t: p['gender']='Female'
    elif 'male' in t: p['gender']='Male'
    if 'farmer' in t: p['farmer']=True
    return p

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        # Always route the public root (including query-string visits) to the app.
        clean=urlparse(path).path
        if clean=='/' or clean=='/index.html' or clean.startswith('/scheme/'):
            path='/static/index.html'
        return super().translate_path(path)
    def do_GET(self):
        p=urlparse(self.path).path
        if p=='/api/health': return self.json({'ok':True,'service':'SchemeFinder','version':'2.3'})
        if p=='/api/config': return self.json({'googleClientId':os.environ.get('GOOGLE_CLIENT_ID','')})
        if p=='/api/schemes': return self.json({'schemes':DATA,'total':len(DATA),'updated':'2026-10-01'})
        if p.startswith('/api/schemes/'):
            sid=p.split('/')[-1]; s=next((x for x in DATA if x['id']==sid),None)
            return self.json(s or {'error':'Scheme not found'},404 if not s else 200)
        return super().do_GET()
    def do_POST(self):
        p=urlparse(self.path).path
        try:
            n=int(self.headers.get('Content-Length','0')); body=json.loads(self.rfile.read(n) or '{}')
        except: return self.json({'error':'Invalid JSON'},400)
        if p=='/api/match':
            if not body.get('occupation') or body.get('age') is None: return self.json({'error':'Age and occupation are required.'},400)
            return self.json({'matches':match(body)})
        if p=='/api/parse-profile':
            parsed=parse_profile(body.get('text',''))
            missing=[k for k in ['age','state','income','occupation','education'] if k not in parsed]
            return self.json({'profile':parsed,'missing':missing})
        return self.json({'error':'Not found'},404)
    def json(self,obj,status=200):
        raw=json.dumps(obj,ensure_ascii=False).encode()
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(raw))); self.send_header('Cache-Control','no-store')
        self.send_header('Access-Control-Allow-Origin','*'); self.end_headers(); self.wfile.write(raw)

os.chdir(ROOT)
port=int(os.environ.get('PORT','8000'))
print(f'SchemeFinder running on port {port}')
ThreadingHTTPServer(('0.0.0.0',port),Handler).serve_forever()
