"""One-time port of the approved mockup CSS (mockup/site/*.css) into a scoped stylesheet: every rule is prefixed with `.club`
so the legacy Tailwind pages and the closet are not affected. Usage: python3 scripts/port-club-css.py <mockup-site-dir> <out.css>"""
import re,sys
site,out=sys.argv[1],sys.argv[2]
FILES=['shared.css','me.css','library.css','detail.css']
def split_blocks(s,i=0):
    """yield (prelude, body) for each top-level block in s"""
    res=[];n=len(s)
    while i<n:
        while i<n and s[i] in ' \n\t\r':i+=1
        if i>=n:break
        j=i;depth=0
        while j<n and s[j]!='{' and s[j]!=';':j+=1
        if j<n and s[j]==';':res.append((s[i:j].strip(),None));i=j+1;continue
        prelude=s[i:j].strip();k=j+1;depth=1
        while k<n and depth:
            if s[k]=='{':depth+=1
            elif s[k]=='}':depth-=1
            k+=1
        res.append((prelude,s[j+1:k-1]));i=k
    return res
def pref(sel):
    parts=[p.strip() for p in re.split(r',(?![^(\[]*[\)\]])',sel) if p.strip()]
    o=[]
    for p in parts:
        if p in(':root',):o.append(p);continue
        if p=='body':o.append('.club');continue
        if p=='html' or p.startswith('html['):
            m=re.match(r'html(\[[^\]]*\])?\s*(.*)$',p);attr=m.group(1) or '';rest=m.group(2)
            o.append(':root'+attr+(' .club '+rest if rest else ' .club'));continue
        if p.startswith('body '):o.append('.club '+p[5:]);continue
        if p=='*':o.append('.club *, .club');continue
        if p.startswith('::backdrop') or p.endswith('::backdrop'):o.append(p);continue
        o.append('.club '+p)
    return ', '.join(o)
def walk(s,hoist):
    r=[]
    for pre,body in split_blocks(s):
        if body is None:r.append(pre+';');continue
        if pre.startswith('@font-face'):hoist.append(pre+'{'+body+'}');continue
        if pre.startswith('@keyframes'):hoist.append(pre+'{'+body+'}');continue
        if pre.startswith('@media') or pre.startswith('@supports'):r.append(pre+'{'+walk(body,hoist)+'}');continue
        if pre.startswith('@'):r.append(pre+'{'+body+'}');continue
        r.append(pref(pre)+'{'+body+'}')
    return '\n'.join(r)
hoist=[];parts=[]
for f in FILES:
    s=open(f'{site}/{f}').read();s=re.sub(r'/\*.*?\*/','',s,flags=re.S)
    s=s.replace('url(assets/fonts/','url(/ui/fonts/').replace('url(assets/grain.png)','url(/ui/grain.png)')
    parts.append(f'/* {f} */\n'+walk(s,hoist))
open(out,'w').write('/* GENERATED from the approved mockup CSS by scripts/port-club-css.py. Edit the script or this file by hand, not both blindly. */\n'+'\n'.join(dict.fromkeys(hoist))+'\n'+'\n'.join(parts)+'\n')
print('wrote',out,sum(len(x) for x in parts))
