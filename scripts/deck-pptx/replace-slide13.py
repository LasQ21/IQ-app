# Replaces slide 13 of the team's editable deck (unpacked .pptx dir) with the live-dashboard slide: full-bleed render,
# a clickable "open the live dashboard" button, new speaker notes.
# Usage: python3 scripts/deck-pptx/replace-slide13.py <unpacked-dir> <slide-13.png from shots.cjs> docs/deck/speaker-notes.json
import json, sys, shutil, os
from xml.sax.saxutils import escape
x, png, notes_json = sys.argv[1], sys.argv[2], sys.argv[3]
E = 6350  # EMU per CSS px (12192000 / 1920)
LIVE = 'https://cc146-wittio.vercel.app/deck#13'
def sp(id_, name, x, y, w, h, body, fill=None, geom='rect', link=True):
    hl = '<a:hlinkClick r:id="rId4" tooltip="Відкрити живий дашборд у браузері"/>' if link else ''
    f = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
    g = '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 22000"/></a:avLst></a:prstGeom>' if geom == 'round' else '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{id_}" name="{name}">{hl}</p:cNvPr><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>'
            f'<p:spPr><a:xfrm><a:off x="{x*E}" y="{y*E}"/><a:ext cx="{w*E}" cy="{h*E}"/></a:xfrm>{g}{f}<a:ln><a:noFill/></a:ln></p:spPr>'
            f'<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"><a:noAutofit/></a:bodyPr><a:lstStyle/>{body}</p:txBody></p:sp>')
def para(text, sz, color, bold):
    b = ' b="1"' if bold else ''
    return (f'<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="uk-UA" sz="{sz}"{b} dirty="0"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
            f'<a:latin typeface="Onest"/><a:cs typeface="Onest"/></a:rPr><a:t>{escape(text)}</a:t></a:r></a:p>')
slide = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
 '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
 '<p:cSld name="Slide 13"><p:bg><p:bgPr><a:solidFill><a:srgbClr val="F5F6FA"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>'
 '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
 '<p:pic><p:nvPicPr><p:cNvPr id="2" name="Живий дашборд журі" descr="Наживо: результати журі з прототипу — кількість тих, хто пройшов тест, медіанний час, частка тих, хто після «Почати» зробив першу вправу, петля крок за кроком, слабкі місця, відповіді «повернулися б завтра» і висновок. У браузері слайд оновлюється наживо."/>'
 '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
 '<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>'
 + sp(3, 'Кнопка: живий дашборд', 1294, 640, 500, 76, para('Відкрити живий дашборд  →', 1600, 'FFFFFF', True), fill='5B47FF', geom='round')
 + sp(4, 'Адреса дашборда', 1294, 726, 500, 34, para('cc146-wittio.vercel.app/deck#13', 1100, 'A3A7BF', False))
 + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>')
open(f'{x}/ppt/slides/slide13.xml', 'w', encoding='utf-8').write(slide)
rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image-13-live.png"/>'
 '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/>'
 '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide13.xml"/>'
 f'<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="{LIVE}" TargetMode="External"/>'
 '</Relationships>')
open(f'{x}/ppt/slides/_rels/slide13.xml.rels', 'w', encoding='utf-8').write(rels)
shutil.copy(png, f'{x}/ppt/media/image-13-live.png')
os.remove(f'{x}/ppt/media/image-13-1.png')
# notes
note = json.load(open(notes_json, encoding='utf-8'))['13'] + (' [PowerPoint] Слайд у PowerPoint статичний. Щоб дашборд жив прямо в слайді: Вставлення → Надбудови → «Web Viewer» (Microsoft) → адреса https://cc146-wittio.vercel.app/live → розтягнути на весь слайд (рахує останні 30 хвилин). Без надбудови: кнопка «Відкрити живий дашборд» відкриє ' + LIVE + ' у браузері.')
p = f'{x}/ppt/notesSlides/notesSlide13.xml'
s = open(p, encoding='utf-8').read()
start = s.index('<a:t>', s.index('Notes Placeholder 2')); end = s.index('</a:t>', start)
s = s[:start + 5] + escape(note) + s[end:]
open(p, 'w', encoding='utf-8').write(s)
print('ok')
