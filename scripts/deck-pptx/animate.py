# Adds build animations and slide transitions to the team's editable deck, using only effects Google Slides has
# (Fade in, Fly in from an edge, Zoom in; Fade / Slide-from-right transitions), so they survive "File -> Import" / upload.
# Every build starts by itself when the slide opens ("After previous" chain): one click still equals one slide, the timing of
# the talk does not change. Google Slides has no start delay, so the stagger is done with "After previous", never with delays.
# Shapes of one card are wrapped in a group (same coordinates, same z-order) so the card moves as one object.
# Usage: python3 scripts/deck-pptx/animate.py docs/deck/CC-146-Wittio-deck-editable.pptx docs/deck/CC-146-Wittio-deck-animated.pptx
# Needs: lxml
import sys, zipfile
from lxml import etree

P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS = {'p': P, 'a': A}

# Step = (target, effect, trigger, duration ms). target: shape id, or (first id, last id) = consecutive shapes grouped into one object.
# effect: fade | zoom | fly-l | fly-r | fly-t | fly-b.  trigger: 'after' (after previous) | 'with' (with previous).
F, Z, L, R, B = 'fade', 'zoom', 'fly-l', 'fly-r', 'fly-b'
AFTER, WITH = 'after', 'with'
SPEC = {
    1: ('fade', [  # executive summary: budget bar builds, chart slides in, then the three numbers land
        (6, F, AFTER, 400), ((19, 24), R, WITH, 500),
        (7, L, AFTER, 350), (8, L, AFTER, 300), (9, L, AFTER, 250),
        ((10, 12), F, AFTER, 250), ((13, 15), F, AFTER, 250), ((16, 18), F, AFTER, 250),
        (25, B, AFTER, 450),
        ((26, 27), Z, AFTER, 300), ((28, 29), Z, AFTER, 300), ((30, 31), Z, AFTER, 300),
        ((32, 35), Z, AFTER, 400),
    ]),
    2: ('push', [  # unit economics: table, then the three takeaways
        (6, F, AFTER, 500), (7, F, WITH, 500),
        ((8, 10), R, AFTER, 400), ((11, 13), R, AFTER, 400), ((14, 16), R, AFTER, 400),
        (17, F, AFTER, 300),
    ]),
    3: ('fade', [  # funnel: rows drop off one by one, then the 55% card
        ((6, 7), F, AFTER, 400),
        ((8, 10), F, AFTER, 200), ((11, 13), F, AFTER, 200), ((14, 16), F, AFTER, 200), ((17, 19), F, AFTER, 200),
        ((20, 22), F, AFTER, 200), ((23, 25), F, AFTER, 200), ((26, 28), F, AFTER, 200), ((29, 31), F, AFTER, 200),
        ((32, 34), Z, AFTER, 400),
        ((35, 37), R, AFTER, 350), ((38, 40), R, AFTER, 350), ((41, 43), R, AFTER, 350),
    ]),
    4: ('fade', [  # diagnosis: bar builds market -> product, then the two argument cards face each other
        ((6, 7), F, AFTER, 400),
        ((8, 10), L, AFTER, 350), ((11, 13), L, AFTER, 250), ((14, 16), L, AFTER, 250), ((17, 19), L, AFTER, 250), (20, F, AFTER, 200),
        ((21, 22), F, AFTER, 300), ((23, 24), F, AFTER, 300),
        ((25, 29), L, AFTER, 450), ((30, 35), R, AFTER, 450),
    ]),
    5: ('push', [  # product walkthrough: screenshots, four findings, conclusion
        ((6, 9), F, AFTER, 450), ((10, 13), F, AFTER, 450),
        ((14, 17), Z, AFTER, 300), ((18, 21), Z, AFTER, 300), ((22, 25), Z, AFTER, 300), ((26, 29), Z, AFTER, 300),
        (30, B, AFTER, 450),
    ]),
    6: ('fade', [  # competitors: table, context cards, our position
        (6, F, AFTER, 500), (7, F, WITH, 500),
        ((8, 15), R, AFTER, 400), ((16, 18), R, AFTER, 400),
        ((19, 21), B, AFTER, 500),
    ]),
    7: ('fade', [  # retention loop: steps appear along the arrows, the loop closes, each churn reason gets its step
        ((6, 9), F, AFTER, 250), (26, F, AFTER, 150), ((10, 13), F, AFTER, 250), (27, F, AFTER, 150),
        ((14, 17), F, AFTER, 250), (28, F, AFTER, 150), ((18, 21), F, AFTER, 250), (29, F, AFTER, 150),
        ((22, 25), Z, AFTER, 350),
        ((30, 33), F, AFTER, 450),
        ((34, 36), F, AFTER, 220), ((37, 39), F, AFTER, 220), ((40, 42), F, AFTER, 220), ((43, 45), F, AFTER, 220),
        ((46, 48), Z, AFTER, 400),
    ]),
    8: ('fade', [  # scope: table, then what we do not do
        (6, F, AFTER, 500), (7, F, WITH, 500),
        ((8, 9), B, AFTER, 400), (10, F, AFTER, 220), (11, F, AFTER, 220), (12, F, AFTER, 220),
        (13, F, AFTER, 300),
    ]),
    9: ('push', [  # business case: table, how we counted, the most sensitive assumption
        (6, F, AFTER, 500), (7, F, WITH, 500),
        ((8, 9), R, AFTER, 450), (10, F, AFTER, 250), (11, F, AFTER, 250), (12, F, AFTER, 250), (13, F, AFTER, 250),
        (14, Z, AFTER, 350), (15, F, AFTER, 300),
    ]),
    10: ('fade', [  # budget: quarters rise one by one, total lands, payback
        ((6, 7), F, AFTER, 400), ((35, 39), F, WITH, 400),
        ((8, 10), B, AFTER, 250), ((40, 61), R, WITH, 500),
        ((11, 13), B, AFTER, 250), ((14, 16), B, AFTER, 250), ((17, 19), B, AFTER, 250), ((20, 22), B, AFTER, 250),
        ((23, 26), B, AFTER, 250), ((27, 30), B, AFTER, 250), ((31, 34), B, AFTER, 250),
        ((62, 63), Z, AFTER, 350),
        ((64, 66), B, AFTER, 450),
    ]),
    11: ('fade', [  # roadmap: workstreams, gates, phases
        ((6, 15), F, AFTER, 400),
        ((16, 17), F, AFTER, 180), ((18, 19), F, AFTER, 180), ((20, 21), F, AFTER, 180), ((22, 23), F, AFTER, 180),
        ((24, 25), F, AFTER, 180), ((26, 27), F, AFTER, 180), ((28, 29), F, AFTER, 180),
        (30, F, AFTER, 250), (33, Z, WITH, 250), (31, F, AFTER, 250), (34, Z, WITH, 250), (32, F, AFTER, 250), (35, Z, WITH, 250),
        ((36, 39), B, AFTER, 350), ((40, 43), B, AFTER, 350), ((44, 47), B, AFTER, 350),
    ]),
    12: ('fade', [  # gates and risks, then the closing line
        ((6, 7), F, AFTER, 400), ((20, 21), F, WITH, 400),
        ((8, 11), F, AFTER, 300), ((12, 15), F, AFTER, 300), ((16, 19), F, AFTER, 300),
        ((22, 24), F, AFTER, 220), ((25, 27), F, AFTER, 220), ((28, 30), F, AFTER, 220), ((31, 32), F, AFTER, 220),
        ((33, 35), B, AFTER, 500),
    ]),
    13: ('push', [  # live dashboard: the button
        (3, Z, AFTER, 450), (4, F, AFTER, 300),
    ]),
}
TRANSITIONS = {
    'fade': '<p:transition xmlns:p="%s" spd="med"><p:fade/></p:transition>' % P,
    'push': '<p:transition xmlns:p="%s" spd="med"><p:push dir="l"/></p:transition>' % P,  # "Slide from right": a new stage starts
}


def cnvpr(el):
    return el.find('./*/p:cNvPr', NS)


def box(el):
    x = el.find('./p:spPr/a:xfrm', NS)
    if x is None:
        x = el.find('./p:xfrm', NS)
    off, ext = x.find('a:off', NS), x.find('a:ext', NS)
    return int(off.get('x')), int(off.get('y')), int(ext.get('cx')), int(ext.get('cy'))


def group(tree, first, last, gid):
    """Wrap the consecutive shapes first..last in a group that keeps their coordinates and their place in the z-order."""
    kids = [c for c in tree if c.tag.split('}')[1] in ('sp', 'pic', 'cxnSp')]
    ids = [int(cnvpr(c).get('id')) for c in kids]
    i, j = ids.index(first), ids.index(last)
    members = kids[i:j + 1]
    assert [tree.index(m) for m in members] == list(range(tree.index(members[0]), tree.index(members[0]) + len(members))), \
        'shapes %s..%s are not consecutive' % (first, last)
    bs = [box(m) for m in members]
    x0, y0 = min(b[0] for b in bs), min(b[1] for b in bs)
    x1, y1 = max(b[0] + b[2] for b in bs), max(b[1] + b[3] for b in bs)
    g = etree.fromstring(
        '<p:grpSp xmlns:p="%s" xmlns:a="%s"><p:nvGrpSpPr><p:cNvPr id="%d" name="Anim group %d-%d"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
        '<p:grpSpPr><a:xfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/><a:chOff x="%d" y="%d"/><a:chExt cx="%d" cy="%d"/></a:xfrm></p:grpSpPr></p:grpSp>'
        % (P, A, gid, first, last, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0))
    tree.insert(tree.index(members[0]), g)
    for m in members:
        g.append(m)
    return gid


class Ids:
    def __init__(self):
        self.n = 2

    def __call__(self):
        self.n += 1
        return self.n


def effect(spid, kind, trigger, dur, nid, bld):
    """One PowerPoint entrance effect node (presets 10 Fade, 23 Zoom in, 2 Fly in) on shape spid."""
    tgt = '<p:tgtEl><p:spTgt spid="%d"/></p:tgtEl>' % spid
    show = ('<p:set><p:cBhvr><p:cTn id="%d" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>%s'
            '<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>')

    def anim(attr, frm, to, extra=''):
        v = lambda s: '<p:strVal val="%s"/>' % s if isinstance(s, str) else '<p:fltVal val="%d"/>' % s
        return ('<p:anim calcmode="lin" valueType="num"><p:cBhvr%s><p:cTn id="%d" dur="%d" fill="hold"/>%s<p:attrNameLst><p:attrName>%s</p:attrName>'
                '</p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val>%s</p:val></p:tav><p:tav tm="100000"><p:val>%s</p:val></p:tav></p:tavLst></p:anim>'
                % (extra, nid(), dur, tgt, attr, v(frm), v(to)))

    head = nid()
    body = show % (nid(), tgt)
    if kind == 'fade':
        preset, sub = 10, 0
        body += '<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="%d" dur="%d"/>%s</p:cBhvr></p:animEffect>' % (nid(), dur, tgt)
    elif kind == 'zoom':
        preset, sub = 23, 16
        body += anim('ppt_w', 0, '#ppt_w') + anim('ppt_h', 0, '#ppt_h')
    else:
        preset = 2
        sub, fx, fy = {'fly-l': (8, '0-#ppt_w/2', '#ppt_y'), 'fly-r': (2, '1+#ppt_w/2', '#ppt_y'),
                       'fly-t': (1, '#ppt_x', '0-#ppt_h/2'), 'fly-b': (4, '#ppt_x', '1+#ppt_h/2')}[kind]
        body += anim('ppt_x', fx, '#ppt_x', ' additive="base"') + anim('ppt_y', fy, '#ppt_y', ' additive="base"')
    grp = ' grpId="0"' if bld else ''
    return ('<p:par><p:cTn id="%d" presetID="%d" presetClass="entr" presetSubtype="%d" fill="hold"%s nodeType="%s">'
            '<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>%s</p:childTnLst></p:cTn></p:par>'
            % (head, preset, sub, grp, 'afterEffect' if trigger == AFTER else 'withEffect', body))


def timing(steps, is_sp):
    """steps: (spid, effect, trigger, dur). Builds one auto-starting sequence; every 'after' step opens a new time slot."""
    nid = Ids()
    slots = []  # [start delay, longest duration, xml]
    for n, (spid, kind, trigger, dur) in enumerate(steps):
        if n == 0 or trigger == AFTER:
            start = slots[-1][0] + slots[-1][1] if slots else 0
            slots.append([start, 0, ''])
            trigger = AFTER
        slots[-1][1] = max(slots[-1][1], dur)
        slots[-1][2] += effect(spid, kind, trigger, dur, nid, is_sp(spid))
    inner = ''.join('<p:par><p:cTn id="%d" fill="hold"><p:stCondLst><p:cond delay="%d"/></p:stCondLst><p:childTnLst>%s</p:childTnLst></p:cTn></p:par>'
                    % (nid(), start, xml) for start, _, xml in slots)
    bld = ''.join('<p:bldP spid="%d" grpId="0" animBg="1"/>' % s for s, *_ in steps if is_sp(s))
    return ('<p:timing xmlns:p="%s"><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
            '<p:par><p:cTn id="%d" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst>'
            '<p:childTnLst>%s</p:childTnLst></p:cTn></p:par>'
            '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
            '</p:childTnLst></p:cTn></p:par></p:tnLst>%s</p:timing>'
            % (P, nid(), inner, '<p:bldLst>%s</p:bldLst>' % bld if bld else ''), slots[-1][0] + slots[-1][1])


def animate(xml, n):
    transition, spec = SPEC[n]
    root = etree.fromstring(xml)
    tree = root.find('./p:cSld/p:spTree', NS)
    for old in root.findall('p:transition', NS) + root.findall('p:timing', NS):
        root.remove(old)
    gid = max(int(e.get('id')) for e in root.iter('{%s}cNvPr' % P)) + 100
    steps, used = [], set()
    for target, kind, trigger, dur in spec:
        if isinstance(target, tuple):
            gid += 1
            target = group(tree, target[0], target[1], gid)
        assert target not in used, 'slide %d: shape %d animated twice' % (n, target)
        used.add(target)
        steps.append((target, kind, trigger, dur))
    tags = {int(cnvpr(e).get('id')): e.tag.split('}')[1] for e in tree if cnvpr(e) is not None}
    assert all(s in tags for s, *_ in steps), 'slide %d: unknown shape id' % n
    t_xml, total = timing(steps, lambda s: tags[s] == 'sp')
    after = root.find('p:clrMapOvr', NS)
    after.addnext(etree.fromstring(TRANSITIONS[transition]))
    after.getnext().addnext(etree.fromstring(t_xml))
    return etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True), len(steps), total


def main(src, dst):
    zin = zipfile.ZipFile(src)
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            name = item.filename
            if name.startswith('ppt/slides/slide') and name.endswith('.xml'):
                n = int(name[len('ppt/slides/slide'):-4])
                if n in SPEC:
                    data, steps, total = animate(data, n)
                    print('slide %2d: %2d effects, build %.1f s, transition %s' % (n, steps, total / 1000, SPEC[n][0]))
            zout.writestr(zipfile.ZipInfo(name, date_time=item.date_time), data, zipfile.ZIP_DEFLATED)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
