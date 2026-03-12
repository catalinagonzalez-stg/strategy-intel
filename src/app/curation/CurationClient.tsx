'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/shared/Badge';
import type { NewsletterEdition, NewsletterItem, Signal, ValidationResult } from '@/lib/supabase/types';
import ReactMarkdown from 'react-markdown';

const MAX_SLACK_LEN = 3900;

/**
 * Convert markdown to a concise Slack mrkdwn preview.
 * Mirrors the logic in send-slack/route.ts — guarantees < 3900 chars.
 */
function mdToSlackPreview(md: string): string {
      let text = md;

  text = text.replace(/\*\*(.+?)\*\*/g, '*$1*');
      text = text.replace(/^### (.+)$/gm, '*$1*');
      text = text.replace(/^## (.+)$/gm, '\n*$1*');
      text = text.replace(/^# (.+)$/gm, '\n*$1*');
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');
      text = text.replace(/^---+$/gm, '');
      text = text.replace(/\n{3,}/g, '\n\n');

  if (text.trim().length <= MAX_SLACK_LEN) {
          return text.trim();
  }

  // Extract core sections and rebuild compact version
  const sections = md.split(/\n(?=##?\s|📰|🔎|🤔)/);
      let opening = '';
      let loImportante = '';
      let implicancia = '';
      let pregunta = '';

  for (const section of sections) {
          const lower = section.toLowerCase();
          if (lower.includes('lo importante') || lower.includes('qué pasó') || lower.includes('que pasó')) {
                    loImportante += section + '\n';
          } else if (lower.includes('implicancia')) {
                    implicancia += section + '\n';
          } else if (lower.includes('pregunta')) {
                    pregunta += section + '\n';
          } else if (!opening) {
                    opening = section + '\n';
          }
  }

  let compact = [opening.trim(), loImportante.trim(), implicancia.trim(), pregunta.trim()]
        .filter(Boolean)
        .join('\n\n');

  compact = compact.replace(/\*\*(.+?)\*\*/g, '*$1*');
      compact = compact.replace(/^### (.+)$/gm, '*$1*');
      compact = compact.replace(/^## (.+)$/gm, '\n*$1*');
      compact = compact.replace(/^# (.+)$/gm, '\n*$1*');
      compact = compact.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');
      compact = compact.replace(/^---+$/gm, '');
      compact = compact.replace(/\n{3,}/g, '\n\n');

  if (compact.length > MAX_SLACK_LEN) {
          compact = [opening.trim(), loImportante.trim(), implicancia.trim()]
            .filter(Boolean)
            .join('\n\n');
          compact = compact.replace(/\*\*(.+?)\*\*/g, '*$1*');
          compact = compact.replace(/^### (.+)$/gm, '*$1*');
          compact = compact.replace(/^## (.+)$/gm, '\n*$1*');
          compact = compact.replace(/^# (.+)$/gm, '\n*$1*');
          compact = compact.replace(/\n{3,}/g, '\n\n');
  }

  if (compact.length > MAX_SLACK_LEN) {
          compact = compact.substring(0, MAX_SLACK_LEN - 3) + '...';
  }

  return compact.trim();
}

interface Props {
      edition: NewsletterEdition | null;
      items: NewsletterItem[];
      signals: Signal[];
      unassignedSignals: Signal[];
}

export default function CurationClient({ edition, items, signals, unassignedSignals }: Props) {
      const router = useRouter();
      const [generating, setGenerating] = useState(false);
      const [sending, setSending] = useState(false);
      const [previewMode, setPreviewMode] = useState<'md' | 'slack'>('md');
      const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
          setGenerating(true);
          setError(null);
          try {
                    const res = await fetch('/api/generate-newsletter', { method: 'POST' });
                    const data = await res.json();
                    if (!res.ok) {
                                setError(data.error || 'Error desconocido');
                                return;
                    }
                    setTimeout(() => rou'tuesre. rcelfireensth'(;)
              ,
                         i3m0p0o0r)t; 
              {   u s e}S tcaattec h}  (fer)o m{ 
      ' r e a c t 's;e
              tiEmrproorrt( S{t ruisnegR(oeu)t)e;r
                             }   f r}o mf i'nnaelxlty/ n{a
              v i g a t i osne't;G
              einmeproartti nBga(dfgael sfer)o;m
        ' @ / c}o
            m p o}n;e
    n
    t s /csohnasrte dh/aBnaddlgeeS'e;n
        diSmlpaocrkt  =t yapsey n{c  N(e)w s=l>e t{t
                                                   e r E d iitfi o(n!,e dNietwisolne)t treertIutrenm;,
                                    S i g nsaelt,S eVnadliindga(ttirouneR)e;s
                                                   u l t   }t rfyr o{m
                                                                       ' @ / l i ba/wsauipta bfaestec/ht(y'p/easp'i;/
                                                                           siemnpdo-rstl aRceka'c,t M{a
                                                                           r k d o w n   f rmoemt h'orde:a c'tP-OmSaTr'k,d
                                                                           o w n ' ; 

                                   c ohnesatd eMrAsX:_ S{L A'CCKo_nLtEeNn t=- T3y9p0e0';:

                                                                     '/a*p*p
                                                                         l i*c aCtoinovne/rjts omna'r k}d,o
                                                                         w n   t o   S l abcokd ym:r kJdSwOnN .psrterviinegwi.f
                                                         y (*{  Meidrirtoirosn _tihde:  leodgiitci oinn. isde n}d)-,s
                                                                     l a c k / r o}u)t;e
                                  . t s   —  a lrwoauytse rf.irtesf riens ha( )s;i
                                  n g l e  }m efsisnaaglel.y
    {*
    / 
         f u n c tsieotnS emnddTionSgl(afcaklPsree)v;i
        e w ( m d}:
  s t}r;i
n
g ) :/ /s tDreirnigv e{ 
S l alcekt  ptreexvti e=w  mfdr;o
    m
      c otnetxetn t=_ mtde x(ts.irnegpllea cseo(u/r\c*e\ *o(f. +t?r)u\t*h\,* /agl,w a'y*s$ 1<* '3)9;0
                             0   ctheaxrts )=
            t ecxotn.srte psllaaccek(P/r^e#v#i#e w( .=+ )e$d/igtmi,o n'?*.$c1o*n't)e;n
    t _ mtde x?t  m=d TtoeSxlta.crkePprleavciee(w/(^e#d#i t(i.o+n).$c/ognmt,e n't\_nm*d$)1 *:' )';'
    ; 

t e xcto n=s tt evxatl.irdeaptliaocne (=/ ^e#d i(t.i+o)n$?/.gvma,l i'd\ant*i$o1n*_'r)e;s
    u l tt eaxst  V=a ltiedxatt.iroenpRleascuel(t/ \|[ (n[u^l\l];]
                                                +
                                                ) \ ]r\e(t(u[r^n) ](+
                                                                    ) \ ) / g<,d i'v< $c2l|a$s1s>N'a)m;e
                                                         = " ftleexxt  h=- stcerxete.nr"e>p
                                                         l a c e ( / ^<-d-i-v+ $c/lgams,s N'a'm)e;=
                                                " f lteexx-t1  =f lteexx tf.lreexp-lcaocle (o/v\enr{f3l,o}w/-gh,i d'd\enn\"n>'
                                                    ) ; 

     i f  <(hteeaxdte.rt rcilma(s)s.Nlaemneg=t"hp x<-=6  MpAyX-_4S LbAoCrKd_eLrE-Nb)  b{o
         r d e r -rzeitnucr-n2 0t0e xdta.rtkr:ibmo(r)d;e
    r - z}i
n
c - 8/0/0 "E>x
t r a c t   c o r e  <sdeicvt icolnass saNnadm er=e"bfulielxd  ictoemmpsa-ccte
    n t ecro njsuts tsiefcyt-iboentsw e=e nm"d>.
    s p l i t ( / \ n ( ? = #<#d?i\vs |c📰l|a🔎|s🤔s)N/a)m;e
= " flleetx  oipteenmisn-gc e=n t'e'r; 
    g a pl-e3t" >l
o I m p o r t a n t e   =   '<'h;2
  c llaests Niammpel=i"ctaenxcti-al g=  f'o'n;t
      - s elmeitb oplrde gtuenxtta- z=i n'c'-;9
0
0   dfaorrk :(tceoxnts-tz isnecc-t1i0o0n" >oSfe lseeccctiioonn ss)e m{a
    n a l < /cho2n>s
t   l o w e r   =   s e c t i{oend.ittoiLoonw e&r&C a<sBea(d)g;e
                                l a b eilf= {(eldoiwteiro.ni.nsctlautduess}( '/l>o} 
                                                                            i m p o r t a n t e ' )  <|/|d ilvo>w
    e r . i n c l u d e s ( '<qduié vp acslóa's)s N|a|m el=o"wfelre.xi ngcalpu-d2e"s>(
    ' q u e   p a s ó' ) )   { 
  < b u t t olno
      I m p o r t a n t e   + =   s e cotniColni c+k ='{\hna'n;d
    l e G e n}e realtsee} 
i f   ( l o w e r . i n c l u d edsi(s'aibmlpeldi=c{agnecniear'a)t)i n{g
                                                                      } 
          i m p l i c a n c i a  c+l=a ssseNcatmieo=n" p+x -'4\ np'y;-
              2   t e x}t -exlss ef oinft -(mleodwieurm. ibngc-lzuidnecs-(9'0p0r edgaurnkt:ab'g)-)z i{n
c - 1 0 0   tperxetg-uwnhtiat e+ =d asrekc:ttieoxnt -+z i'n\cn-'9;0
                                                                                                      0   r o u}n deelds eh oivfe r(:!ooppaecniitnyg-)9 0{ 
d i s a b l eodp:eonpiancgi t=y -s5e0c"t
    i o n   +   ' \ n ' ; 
      > 
          } 
} 

     l e t   c o m p{agcetn e=r a[toipnegn i?n g'.Gterniemr(a)n,d ol.o.I.m'p o:r t'aGnetnee.rtarri mn(e)w,s liemtptleirc'a}n
         c i a . t r i m ( ) ,   p r e<g/ubnuttat.otnr>i
                     m ( ) ] 
         . f i l t e{re(dBiotoiloena?n.)s
                        t a t u s. j=o=i=n (''v\anl\ind'a)t;e
                            d
                     '   &c&o m(p
                         a c t   =   c o m p a c t . r e p<lbauctet(o/n\
                                                                    * \ * ( . + ? ) \ * \ * / g ,   ' * $o1n*C'l)i;c
                                                                    k = {choamnpdalcetS e=n dcSolmapcakc}t
                     . r e p l a c e ( / ^ # # #   ( . + )d$i/sgamb,l e'd*=${1s*e'n)d;i
                     n g }c
o m p a c t   =   c o m p a c t . r ecpllaascseN(a/m^e#=#" p(x.-+4) $p/yg-m2,  t'e\xnt*-$x1s* 'f)o;n
                                                 t - mceodmipuamc tb g=- gcroemepna-c6t0.0r etpelxatc-ew(h/i^t#e  (r.o+u)n$d/egdm ,h o'v\enr*:$b1g*-'g)r;e
e n -c7o0m0p adcits a=b lceodm:poapcatc.irteyp-l5a0c"e
( / \ [ ( [ ^ \ ] ] + ) \ ] \ ( (>[
 ^ ) ] + ) \ ) / g ,   ' < $ 2 | $ 1 >{'s)e;n
d i ncgo m?p a'cEtn v=i acnodmop.a.c.t'. r:e p'lEancvei(a/r^ -a- -S+l$a/cgkm',} 
' ' ) ; 
     c o m p a c t   =  <c/obmuptatcotn.>r
e p l a c e ( / \ n { 3 , } /)g},
  ' \ n \ n ' ) ; 

    <i/fd i(vc>o
            m p a c t . l e n g t<h/ d>i vM>A
X _ S L A C K _ L E N{)e d{i
                           t i o n  c&o&m p(a
                                            c t   =   [ o p e n i n g<.pt rcilma(s)s,N almoeI=m"ptoerxtta-nxtse .tterxitm-(z)i,n ci-m5p0l0i cmatn-c1i"a>.
                               t r i m ( ) ] 
                                   .Efdiilctieónr:( B{oeodlietaino)n
                           . e d i t i o.nj_odiant(e'}\ n|\ nT'e)m;a
                           :   { e dciotmipoanc.tt e=m ac_osmepmaacnta. r|e|p l'a—c'e}(
                                       / \ * \ * ( . + ? ) \ * \<*//pg>,
                                         ' * $ 1 * ' ) ; 
                        ) } 
  c o m p a c t  <=/ hceoamdpearc>t
                      .
      r e p l a c e ( /{^e#r#r#o r( .&+&) $(/
                     g m ,   ' * $ 1 * ' )<;d
                      i v   c lcaosmspNaacmte ==" pcxo-m6p apcyt-.3r ebpgl-arceed(-/5^0# #d a(r.k+:)b$g/-grme,d -'9\5n0*/$210* 'b)o;r
                          d e r - bc obmopradcetr -=r ecdo-m2p0a0c td.arrekp:lbaocred(e/r^-#r e(d.-+8)0$0/"g>m
                          ,   ' \ n * $ 1 * ' ) ; 
< p   c lcaosmspNaacmte ==" tceoxmtp-axcst .froenptl-amceed(i/u\mn {t3e,x}t/-gr,e d'-\7n0\0n 'd)a;r
    k : t}e
x
t - riefd -(4c0o0m"p>aEcrtr.olre:n g{tehr r>o rM}A<X/_pS>L
    A C K _ L E N )   { 
< / d i vc>o
    m p a c t   =   c)o}m
    p
    a c t . s u b s t{rvianlgi(d0a,t iMoAnX _&S&L A!CvKa_lLiEdNa t-i o3n). v+a l'i.d. .&'&; 
    ( 
    } 

         r e t u r<nd icvo mcplaacsts.Ntarmiem=(")p;x
    -}6

    piyn-t3e rbfga-cree dP-r5o0p sd a{r
        k : begd-irteido-n9:5 0N/e2w0s lbeotrtdeerrE-dbi tbioornd e|r -nrueldl-;2
    0 0  idtaermks::b oNredwesrl-ertetde-r8I0t0e"m>[
    ] ; 
         s i g n a l s :< pS icglnaasls[N]a;m
    e = "utneaxsts-ixgsn efdoSnitg-nmaeldsi:u mS itgenxatl-[r]e;d
    -}7
    0
    0e xdpaorrkt: tdeexfta-urletd -f4u0n0c tmibo-n1 "C>uVraaltiidoancCilóni efnatl(l{i dead<i/tpi>o
        n ,   i t e m s ,   s i g<nuall sc,l ausnsaNsasmieg=n"etdeSxitg-nxasl st e}x:t -Prreodp-s6)0 0{ 
    d a rcko:ntsetx tr-oruetde-r4 0=0  usspeaRcoeu-tye-r0(.)5;"
    > 
      c o n s t   [ g e n e r a t{ivnagl,i dsaettiGoenn.eerrartoirnsg.]m a=p (u(see,S tia)t e=(>f a<llsie )k;e
    y = {cio}n>s•t  {[es}e<n/dliin>g),} 
    s e t S e n d i n g ]   =< /uusle>S
        t a t e ( f a l s e ) ; 
        { v acloindsatt i[opnr.ewvairenwiMnogdse.,l esnegttPhr e>v i0e w&M&o d(e
        ]   =   u s e S t a t e < ' m<du'l  |c l'asslsaNcakm'e>=("'tmedx't)-;x
        s   tceoxnts-ta m[beerrr-o6r0,0  sdeatrEkr:rtoerx]t -=a mubseerS-t4a0t0e <mstt-r1i nsgp a|c en-uyl-l0>.(5n"u>l
        l ) ; 

             c o n s t   h a n d{lveaGleindeartaitoen .=w aarsnyinncg s(.)m a=p>( ({w
                 ,   i )  s=e>t G<elnie rkaetyi=n{gi(}t>r⚠ u{ew)};<
        / l i > )s}e
                 t E r r o r ( n u l l ) ; 
                   < / u lt>r
                   y   { 
                                    c o n)s}t
                     r e s   =   a w a i<t/ dfievt>c
                   h ( ' / a p i / g)e}n
                   e
                   r a t e - n e w s{lveatltiedra't,i o{n  m&e&t hvoadl:i d'aPtOiSoTn'. v}a)l;i
                   d   & &   v acloindsatt idoant.aw a=r naiwnagist. lreensg.tjhs o>n (0) ;&
                   &   ( 
                         i f   ( ! r e s<.doikv)  c{l
                             a s s N a m e = "spext-E6r rpoyr-(3d abtga-.aemrbreorr- 5|0|  d'aErrkr:obrg -daemsbceorn-o9c5i0d/o2'0) ;b
                         o r d e r - b   broertduerrn-;a
                         m b e r - 2 0}0
                           d a r k : bsoertdTeirm-eaomubte(r(-)8 0=0>" >r
                         o u t e r . r e f r e s h<(u)l,  c3l0a0s0s)N;a
                         m e = " t}e xcta-txcsh  t(eex)t -{a
                             m b e r - 6 0s0e tdEarrrko:rt(eSxttr-ianmgb(eer)-)4;0
                         0   s p a}c ef-iyn-a0l.l5y" >{
                             
                                          s e t G e n e r{avtailnigd(aftailosne.)w;a
                         r n i n g}s
                         . m a}p;(
                         (
                         w ,  cio)n s=t>  h<alnid lkeeSye=n{diS}l>a⚠c k{ w=} <a/slyin>c) }(
                         )   = >   { 
                                      i f< /(u!le>d
                             i t i o n )   r e t u<r/nd;i
                         v > 
                             s e t S e n d)i}n
                         g
                         ( t r u e ) ; 
                           < d i vt rcyl a{s
                                           s N a m e = "afwlaeixt- 1f eotvcehr(f'l/oawp-ia/usteon"d>-
                           s l a c k ' ,   { 
                                 < d i v   c l amsestNhaomde:= "'gPrOiSdT 'g,r
                                     i d - c o l s - 2h edaidveirdse:- x{  d'iCvoindtee-nzti-nTcy-p2e0'0:  d'aarpkp:ldiicvaitdieo-nz/ijnsco-n8'0 0} ,h
                           - f u l l " > 
                                   b o d y :   J S O N . s{t/r*i nLgeiffty:( {I teedmist i/o nS_iigdn:a lesd i*t/i}o
                                 n . i d   } ) , 
                                         < d i}v) ;c
                                 l a s s N a mreo=u"toevre.rrfelforwe-sahu(t)o; 
                                 p - 4 " >}
                                   f i n a l l y   { 
                                               < h 3s ectlSaesnsdNianmge(=f"atlesxet)-;s
                                 m   f o n}t
                                 - s e}m;i
                                 b
                                 o l d/ /t eDxetr-izvien cS-l7a0c0k  dparrekv:iteewx tf-rzoimn cc-o3n0t0e nmtb_-m3d" >—
                                   s i n g l e   s o u r c e   o fH itgrhultihg,h tasl weany se s<t3a9 0e0d icchiaorns 
                                 ( { ictoenmsst. lselnagctkhP}r)e
                                 v i e w   =   e d i t i o n ?<./cho3n>t
                                 e n t _ m d   ?   m d T o S l{aictkePmrse.vlieenwg(tehd i=t=i=o n0. c&o&n t(e
                                                                                                             n t _ m d )   :   ' ' ; 
                                  
                                      c<opn sctl avsaslNiadmaet=i"otne x=t -exdsi ttieoxnt?-.zvianlci-d4a0t0i"o>nN_or ehsauyl ti taesm sV.a lGiednaetriao neRle snuelwts l|e tntuelrl ;p
                                      a
                                      r a  rcerteuarrn  e(l
                                        d r a f<td.i<v/ pc>l
                                      a s s N a m e = " f l e x   h)-}s
                                      c r e e n " > 
                                                   <<ddiivv  ccllaassssNNaammee==""fslpeaxc-e1- yf-l2e"x> 
                                                   f l e x - c o l   o v e r f l o w{-ihtiedmdse.nm"a>p
                                                   ( ( i t e m )   =<>h e(a
                                                   d e r   c l a s s N a m e = " p x - 6< dpiyv- 4k ebyo=r{dietre-mb. ibdo}r dcelra-szsiNnacm-e2=0"0b odradrekr: bboorrddeerr--zziinncc--820000" >d
                                                   a r k : b o r d e r -<zdiinvc -c8l0a0s srNoaumned=e"df-llegx  pi-t3e"m>s
                                                   - c e n t e r   j u s t i f y - b e t w e<edni"v> 
                                                   c l a s s N a m e = " f l<edxi vi tcelmass-scNeanmtee=r" fglaepx- 2i tmebm-s1-"c>e
                                                   n t e r   g a p - 3 " > 
                                                                       < B a d g<eh 2l acbleals=s{Niatmeem=."steecxtti-olng  |f|o n't—-'s}e mviabroiladn tt=e"xlto-wz"i n/c>-
                                                   9 0 0   d a r k : t e x t - z i n c - 1 0 0 "{>iSteelme.clcoiwo_ne vsiedmeanncael <&/&h 2<>B
                                                   a d g e   l a b e l = " l o w{ eedviitdieonnc e&"&  v<aBraidagnet =l"ambeedl"= {/e>d}i
                                                       t i o n . s t a t u s }   / > } 
                                                               < s p a n   c<l/adsisvN>a
                                                   m e = " t e x t - x s   t<edxitv- zcilnacs-s4N0a0m"e>=#"{filteexm .gsaopr-t2_"o>r
                                                   d e r } < / s p a n > 
                                                         < b u t t o n 
                                                                                 < / d i v > 
                                                                                 o n C l i c k = { h a n d l e G e n e r a<tpe }c
                                                                                 l a s s N a m e = " t e x t - x sd itseaxbtl-ezdi=n{cg-e7n0e0r adtairnkg:}t
                                                                                 e x t - z i n c - 3 0 0   m b - 1c"l>a{sistNeamm.ee=d"iptxo-r4i aply_-t2e xtte}x<t/-px>s
                                                                                   f o n t - m e d i u m   b g - z i n c -<9d0i0v  dcalraks:sbNga-mzei=n"ct-e1x0t0- xtse xtte-xwth-iztien cd-a5r0k0: tsepxatc-ez-iyn-c0-.950"0> 
                                                                                   r o u n d e d   h o v e r : o p a c i t y - 9<0p >d
                                                                                   i s a b l e d : o p a c i t y - 5 0 " 
                                                                                             F u e n t e : { '  >'
                                                                                             } 
                                                                                       { g e n e r a t i n<ga  ?h r'eGfe=n{eirtaenmd.os.u.p.p'o r:t i'nGge_nuerrla}r  tnaerwgselte=t"t_ebrl'a}n
                                                                                   k "   r e l = " n o o p e n e<r/ bnuotrteofne>r
                                                                                   r e r "   c l a s s N a m e ={"etdeixtti-obnl?u.es-t6a0t0u sh o=v=e=r :'uvnadleirdlaitneed"'> 
                                                                                   & &   ( 
                                                                                                                    < b u t t o{ni
                                                                                                                                t e m . s u p p o r t i n g _ s o u rocneC}l
                                                                                   i c k = { h a n d l e S e n d S l a c k } 
                                                                                         < / a > 
                                                                                                               d i s a b l e d = { s e n d{i'n g— }'
                                                                                             } 
                                                                                                                           c l a s s N a m{ei=t"epmx.-s4u pppyo-r2t itnegx_tp-uxbsl ifsohnetd-_maetd
                                                                                         i u m   b g - g r e e n - 6 0 0   t e x t - w h i t e?  rnoeuwn dDeadt eh(oivteerm:.bsgu-pgproeretni-n7g0_0p udbilsiasbhleedd_:aotp)a.ctiotLyo-c5a0l"e
                                                                                         D a t e S t r i n g ( ' e s ' ) 
                                                                                         > 
                                                                                             { s e n d i n:g  '?— ''}E
                                                                                         n v i a n d o . . . '   :   ' E n v i a r   a< /Spl>a
                                                                                         c k ' } 
                                                                                                                          < /<bpu tctloans>s
                                                                                                                          N a m e = " i t a l i c " > "){}i
                                                                                                                          t e m . s u p p o r t i n<g/_dqiuvo>t
                                                                                                                          e } " < / p > 
                                                                                                                                < / d i v > 
                                                                                                                                    {<e/ddiitvi>o
                                                                                                                                        n   & &   ( 
                                                                                                                                                        <</>pd icvl>a
                                                                                                                                s s N a m e = " t e x t - x s   t)e)x}t
                                                                                                                                - z i n c - 5 0 0   m t - 1 "<>/
                                                                                                                                d i v > 
                                                                                                                                 
                                                                                                                                                  E d i c i ó{nu:n a{sesdiigtnieodnS.iegdniatliso.nl_ednagtteh}  >|  0T e&m&a :( 
                                                                                                                                    { e d i t i o n . t e m a _ s e m<a>n
                                                                                                                                    a   | |   ' —' } 
                                                                                                                                                        < h 3< /cpl>a
                                                                                                                                                        s s N a m e = " t e x)t}-
                                                                                                                                                        s m   f o n t - s<e/mhiebaodledr >t
                                                                                                                                                        e
                                                                                                                                                        x t - z i n c - 7{0e0r rdoarr k&:&t e(x
                                                                                                                                                        t - z i n c - 3 0 0  <mdti-v6  cmlba-s3s"N>a
                                                                                                                                                        m e = " p x - 6   p y - 3   b g - r e d -H5i0g hdlairgkh:tbsg -preendd-i9e5n0t/e2s0  (b{ourndaesrs-ibg nbeodrSdiegrn-arlesd.-l2e0n0g tdha}r)k
                                                                                                                                                        : b o r d e r - r e d - 8 0 0 " > 
                                                                                                                                                          < / h 3 > 
                                                                                                                                                                      < p   c l a s s N a m e =<"dtievx tc-lxass sfNoanmte-=m"esdpiaucme -tye-x2t"->r
                                                                                                                                                                      e d - 7 0 0   d a r k : t e x t - r e d -{4u0n0a"s>sEirgrnoerd:S i{genrarlosr.}m<a/pp(>s
                                                                                                                                                                            = >   ( 
                                               < / d i v > 
                                                                ) } 
                                               <
                                                   d i v   k e y = {{sv.aildi}d actliaosns N&a&m e!=v"abloirddaetri obno.rvdaelri-dd a&s&h e(d
                                                 b o r d e r - z i n<cd-i3v0 0c ldaasrskN:abmoer=d"eprx--z6i npcy--730 0b gr-oruendd-e5d0- ldga rpk-:3b"g>-
                                               r e d - 9 5 0 / 2 0   b o r d e r - b   b o r d e<rd-irve dc-l2a0s0s Ndaamrek=:"bfolredxe ri-treemds--8c0e0n"t>e
                                               r   g a p - 2   m b - 1 "<>p
                                                 c l a s s N a m e = " t e x t - x s   f o n t - m e<dBiaudmg et elxatb-erle=d{-s7.0s0i gdnaarlk_:ttyepxet}- rveadr-i4a0n0t =m"bl-o1w""> V/a>l
                                               i d a c i ó n   f a l l i d a < / p > 
                                                             < B a d g e< ulla bcella=s{ssN.aimmep=a"ctte_xlte-vxesl  t|e|x t'-lroewd'-}6 0/0> 
                                               d a r k : t e x t - r e d - 4 0 0   s p a c e - y<-/0d.i5v">>
                                               
                                                   { v a l i d a t i o<np. ecrlraosrssN.ammaep=("(tee,x ti-)x s= >t e<xlti- zkienyc=-{7i0}0> • d{aer}k<:/tleix>t)-}z
                                                   i n c - 3 0 0 " > { s . s<u/mumla>r
                                                       y _ f a c t u a l } < / p{>v
                                                       a l i d a t i o n . w a r n i n g s . l e n g t h< p>  c0l a&s&s N(a
                                                       m e = " t e x t - x s   t e x<tu-lz icnlca-s5s0N0a mmet=-"1t"e>x{ts-.xfsi ntteoxct_-iammpbleirc-a6t0i0o nd}a<r/kp:>t
                                                       e x t - a m b e r - 4 0 0   m t - 1   s p a c<e/-dyi-v0>.
                                                       5 " > 
                                                           {)v)a}l
                                                       i d a t i o n . w a r n i n g s . m a<p/(d(iwv,> 
                                                       i )   = >   < l i   k e y = { i }<>/⚠> 
                                                           { w } < / l i > ) } 
                                                                   ) } 
                                                                           < / u l ><
                                                   / d i v > 
                                                                            
                                                                                       ) } 
                                                                               { / *   R i g<h/td:i vP>r
                                                                           e v i e w   * / })
                                                                               } 
                                                                            
                                                                               { v<adliivd actliaosns N&a&m ev=a"loivdeartfiloonw.-vaaultiod  p&-&4 "v>a
                                                                           l i d a t i o n . w a r n i n<gdsi.vl ecnlgatshs N>a m0e =&"&f l(e
                                                                           x   i t e m s - c e n<tdeirv  gcalpa-s2s Nmabm-e3="">p
                                                                           x - 6   p y - 3   b g - a m b e r<-h530  cdlaarsks:Nbagm-ea=m"bteerx-t9-5s0m/ 2f0o nbto-rsdeemri-bbo lbdo rtdeexrt--azmibnecr--720000  ddaarrkk::tbeoxrtd-ezri-nacm-b3e0r0-"8>0P0r"e>v
                                                                           i e w < / h 3 > 
                                                                                   < u l   c l a s s N a m e<=d"itve xctl-axsss Ntaemxet=-"afmlbeexr -r6o0u0n ddeadr-km:dt eoxvte-rafmlboewr--h4i0d0d esnp abcoer-dye-r0 .b5o"r>d
                                                                                   e r - z i n c - 2 0 0   d a r{kv:abloirddaetri-ozni.nwca-r7n0i0n"g>s
                                                                                   . m a p ( ( w ,   i )   = >   < l i  <kbeuyt=t{oin}
                                                                                   > ⚠  { w } < / l i > ) } 
                                                                                                   o n C l i<c/ku=l{>(
                                                                                   )   = >   s e t P r e<v/ideiwvM>o
                                                                                   d e ( ' m d ' ) })
                                                                                       } 
                                                                                    
                                                                                                    < d i v   c l a s scNlaamses=N"afmlee=x{-`1p xo-v2e rpfyl-o0w.-5a utteox"t>-
                                                                                                    x s   $ { p r e v i e<wdMiovd ec l=a=s=s N'ammde'= "?g r'ibdg -gzriindc--c9o0l0s -t2e xdti-vwihdiet-ex  ddairvki:dbeg--zziinncc--210000  ddaarrkk::dtievxitd-ez-iznicn-c9-0800'0  :h -'ftuelxlt"->z
                                                                                                    i n c - 5 0 0 ' } ` } 
                                                                                                        { / *   L e f t :   I t e m s   /  >SNiegwnsallest t*e/r}<
                                                       / b u t t o n > 
                                                                                                                < d i v   c l a s s N a m e =<"bouvtetrofnl
                                                                                                                o w - a u t o   p - 4 " > 
                                                                                                                              o n C l i c k =<{h(3)  c=l>a ssseNtaPmree=v"iteewxMto-dsem( 'fsolnatc-ks'e)m}i
                                                                                                                              b o l d   t e x t - z i n c - 7 0 0   d acrlka:stseNxatm-ez=i{n`cp-x3-020  pmyb--03."5> 
                                                                                                                              t e x t - x s   $ { p r e v i e wHMiogdhel i=g=h=t s' selna ceks't a?  e'dbigc-izoinn c(-{9i0t0e mtse.xlte-nwghtiht}e) 
                                                                                                                              d a r k : b g - z i n c - 1 0<0/ hd3a>r
                                                                                                                              k : t e x t - z i n c - 9 0 0{'i t:e m'st.elxetn-gztihn c=-=5=0 00' }&`&} 
                                                                                                                              ( 
                                                                                                                                                               <>pS lcalcaks<s/Nbaumtet=o"nt>e
                                                                                                                                                               x t - x s   t e x t - z i n c - 4<0/0d"i>vN>o
                                                                                                                                                                 h a y   i t e m s .   G e n e r{ap reelv ineewwMsoldeet t=e=r=  p'asrlaa cckr'e a&r&  esll adcrkaPfrte.v<i/epw> 
                                                                                                                                                               & &   ( 
                                                                                                                                                                                   ) } 
                                                                                                                                                                           < s p a n   c l a<sdsiNva mcel=a{s`stNeaxmte-=x"ss pfaocnet--ym-o2n"o> 
                                                                                                                                                               $ { s l a c k P r e v i e w . l e{nigttehm s<.=m aMpA(X(_iStLeAmC)K _=L>E N( 
                                                                                                                                                               ?   ' t e x t - g r e e n - 6 0 0 '  <:d i'vt ekxety-=r{eidt-e6m0.0i'd}}` }c>l
                                                                                                                                                               a s s N a m e = " b o r d e r   b o r d e{rs-lzaicnkcP-r2e0v0i edwa.rlke:nbgotrhd.etro-Lzoicnacl-e8S0t0r irnogu(n)d}e d/- l{gM ApX-_3S"L>A
                                                                                                                                                               C K _ L E N . t o L o c a l e S t r i n g<(d)i}v  cchlaarsss N✓
                                                                                                                                                               a m e = " f l e x   i t e m s - c e n<t/esrp agna>p
                                                                                                                                                               - 2   m b - 1 " > 
                                                                                                                                                                             ) } 
                                                                                                                                                                                         < B<a/ddgiev >l
                                                                                                                                                               a b e l = { i t e m . s e c t{ieodni t|i|o n'?—'.}c ovnatreinatn_tm=d" l?o w("
                                                                                                                                                                 / > 
                                                                                                                                                                                         p r e v i e w M o d{ei t=e=m=. l'omwd_'e v?i d(e
                                                                                                                                                               n c e   & &   < B a d g e   l a b e l<=a"rltoiwc leev icdleanscseN"a mvea=r"imaanxt-=w"-mneodn"e "/>>
                                                                                                                                                                   } 
                                                                                                                                                                                                     < d i v< scplaans scNlaamses=N"apmreo=s"et epxrto-sxes- ztienxct -dzairnkc:-p4r0o0s"e>-#i{nivteermt. sporrots_eo-rsdme rp}r<o/ssep-ahne>a
                                                                                                                                                               d i n g s : f o n t - s e m i b o l d   p<r/odsiev->h
                                                                                                                                                               e a d i n g s : t r a c k i n g - t i g h<tp  pcrloasses-Nha1m:et=e"xtte-xxtl- xpsr otseex-th-1z:imnbc--47 0p0r odsaer-kh:2t:etxetx-tz-ibnacs-e3 0p0r omsbe--1h"2>:{mitt-e6m .perdoisteo-rhi2a:lm_bt-e3x tp}r<o/spe>-
                                                                                                                                                               p : l e a d i n g - r e l a x e d   p r o<sdei-va :ctleaxsts-Nbalmuee=-"6t0e0x td-axrsk :tperxots-ez-ian:ct-e5x0t0- bslpuaec-e4-0y0- 0p.r5o"s>e
                                                                                                                                                               - a : n o - u n d e r l i n e   h o v e r : p<rpo>s
                                                                                                                                                               e - a : u n d e r l i n e   p r o s e - b l o c kFquueonttee::b{o'r d'e}r
                                                                                                                                                               - l - z i n c - 9 0 0   d a r k : p r o s e - b l<oac khqrueoft=e{:ibtoermd.esru-plp-ozritnicn-g4_0u0r lp}r otsaer-gbelto=c"k_qbuloatnek:"f ornetl-=m"endoioupme nperro sneo-rbelfoecrkrqeuro"t ec:lnaosts-Niatmael=i"ct epxrto-sbel-uher-:6b0o0r dheorv-ezri:nucn-d2e0r0l idnaer"k>:
                                                                                                                                                               p r o s e - h r : b o r d e r - z i n c - 8 0 0   p r{oistee-ml.is:umpaprokretri:ntge_xsto-uzricnec}-
                                                                                                                                                               4 0 0 " > 
                                                                                                                                                                                                     < / a ><
                                                           R e a c t M a r k d o w n > { e d i t i o n . c o{n't e—n t'_}m
                                                                                                                                                                                                     d } < / R e a c t M a r k d o w n > 
                                                                                                                                                                                                                 { i t e m . s u p p o r t i n<g/_dpiuvb>l
                                                                                                                                                                                                     i s h e d _ a t 
                                                                                                                                                                                                                         < / a r t i c l e > 
                                                                                                                                                                                                                                     ?   n e w   D a t e ()i t:e m(.
                                                                                                                                                                                                                         s u p p o r t i n g _ p u b l i s h e<dp_raet )c.ltaosLsoNcaamlee=D"awtheiSttersipnagc(e'-epsr'e)-
                                                                                                                                                                                                                         w r a p   t e x t - x s   f o n t - m o n o   b g - z:i n'c—'-}5
                                                                                                                                                                                                                         0   d a r k : b g - z i n c - 9 0 0   p - 4  <r/opu>n
                                                                                                                                                                                                                         d e d - l g   l e a d i n g - r e l a x e d "<>p
                                                                                                                                                                                                                           c l a s s N a m e = " i t a l i c " > "{{siltaecmk.Psruepvpioerwt}i
                                                                                                                                                                                                                         n g _ q u o t e } " < / p > 
                                                                                                                                                                                                                                 < / p r e > 
                                                                                                                                                                                                                                                     < / d i v > 
                                                                                                                                                                                                                                                     ) 
                                                                                                                                                                                                                                                                                  )   :< /(d
                                                                                                                                                                                                                                                                                  i v > 
                                                                                                                                                                                                                                                                                                            < p   c)l)a}s
                                                                                                                                                                                                                                                                                  s N a m e = " t e x t - x s  <t/edxitv->z
                                                                                                                                                                                                                                                                                  i
                                                                                                                                                                                                                                                                                  n c - 4 0 0 " > S i n   c o n{tuennaisdsoi ganúne.d SGiegnnearlas .elle nngetwhs l>e t0t e&r&. <(/
                                                                                                                                                                                                                                                                                  p > 
                                                                                                                                                                                                                                                                                                              <)>}
                                                                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                                                                                       < / d i v ><
                                                               h 3   c l a s s N a m<e/=d"itve>x
                                                                                                                                                                                                                                                                                                                                       t - s m   f o n t<-/sdeimvi>b
                                                                                                                                                                                                                                                                                                                                       o l d   t e x<t/-dziivn>c
                                                                                                                                                                                                                                                                                                                                       - 7 0 0  <d/adrikv:>t
                                                                                                                                                                                                                                                                                                                                       e x t)-;z
                                                                                                                                                                                                                                                                                                                                       i}nc-300 mt-6 mb-3">
                                                                                                                                                                                                                                                                                                                                                           Highlights pendientes ({unassignedSignals.length})
                                                                                                                                                                                                                                                                                                                                                         </>h3>
                                                                                                                                                                                                                                                                                                                                                         <div className="space-y-2">
                                                                                                                                                                                                                                                                                                                                                                             {unassignedSignals.map(s => (
                                                                                     <div key={s.id} className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-3">
                                                                                                             <div className="flex items-center gap-2 mb-1">
                                                                                                                                       <Badge label={s.signal_type} variant="low" />
                                                                                                                                       <Badge label={s.impact_level || 'low'} />
                                                                                                                 </div>div>
                                                                                                             <p className="text-xs text-zinc-700 dark:text-zinc-300">{s.summary_factual}</p>p>
                                                                                                             <p className="text-xs text-zinc-500 mt-1">{s.fintoc_implication}</p>p>
                                                                                         </div>div>
                                                                                   ))}
                                                                                                                                                                                                                                                                                                                                                                           </div>div>
                                                                                                                                                                                                                                                                                                                                                       </>>
                                                                                                                                                                                                                                                                                                                            )}
                                                                                                                                                                                                                                                                                                                          </>div>
                                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                                                                              {/* Right: Preview */}
                                                                                                                                                                                                                                                                                              <div className="overflow-auto p-4">
                                                                                                                                                                                                                                                                                                            <div className="flex items-center gap-2 mb-3">
                                                                                                                                                                                                                                                                                                                            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Preview</h3>h3>
                                                                                                                                                                                                                                                                                                                            <div className="flex rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                                                                                                                                                                                                                                                                                                                              <button
                                                                                                                                                                                                                                                                                                                                                                      onClick={() => setPreviewMode('md')}
                                                                                                                                                                                                                                                                                                                                                                      className={`px-2 py-0.5 text-xs ${previewMode === 'md' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500'}`}
                                                                                                                                                                                                                                                                                                                                                                    >Newsletter</button>button>
                                                                                                                                                                                                                                                                                                                                              <button
                                                                                                                                                                                                                                                                                                                                                                      onClick={() => setPreviewMode('slack')}
                                                                                                                                                                                                                                                                                                                                                                      className={`px-2 py-0.5 text-xs ${previewMode === 'slack' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500'}`}
                                                                                                                                                                                                                                                                                                                                                                    >Slack</button>button>
                                                                                                                                                                                                                                                                                                                                            </div>div>
                                                                                                                                                                                                                                                                                                                            {previewMode === 'slack' && slackPreview && (
                                                                                 <span className={`text-xs font-mono ${slackPreview.length <= MAX_SLACK_LEN ? 'text-green-600' : 'text-red-600'}`}>
                                                                                     {slackPreview.length.toLocaleString()} / {MAX_SLACK_LEN.toLocaleString()} chars ✓
                                                                                     </span>span>
                                                                                                                                                                                                                                                                                                                            )}
                                                                                                                                                                                                                                                                                                                          </div>div>
                                                                                                                                                                                                                                                                                                            {edition?.content_md ? (
                                                                               previewMode === 'md' ? (
                                                                                                     <article className="max-w-none">
                                                                                                                         <div className="prose prose-zinc dark:prose-invert prose-sm prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h1:mb-4 prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-p:leading-relaxed prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-zinc-900 dark:prose-blockquote:border-l-zinc-400 prose-blockquote:font-medium prose-blockquote:not-italic prose-hr:border-zinc-200 dark:prose-hr:border-zinc-800 prose-li:marker:text-zinc-400">
                                                                                                                                               <ReactMarkdown>{edition.content_md}</ReactMarkdown>ReactMarkdown>
                                                                                                                             </div>div>
                                                                                                         </article>article>
                                                                                                   ) : (
                                                                                                     <pre className="whitespace-pre-wrap text-xs font-mono bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg leading-relaxed">
                                                                                                         {slackPreview}
                                                                                                         </pre>pre>
                                                                                                   )
                                                                             ) : (
                                                                               <p className="text-xs text-zinc-400">Sin contenido aún. Genera el newsletter.</p>p>
                                                                                                                                                                                                                                                                                                            )}
                                                                                                                                                                                                                                                                                                          </div>div>
                                                                                                                                                                                                                                                                                            </>div>
                                                                                                                                                                                                                                                                                          </>div>
                                                                                                                                                                                                                                                           </>div>
                                                                                                                                                                                                                                     </>div>
                                                                                                                                                                                                                           );
                                                                                                                                                                                                                         }</></></></></></></></elnie>
