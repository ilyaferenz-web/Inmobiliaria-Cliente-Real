from pathlib import Path
p = Path('c:/Users/ilyaf/OneDrive/Desktop/ProyectoPalo/dist/assets/index-BtyftiJJ.js')
text = p.read_text(encoding='utf-8', errors='ignore')
needle = '🔁 Reemplazar / Modificar'
idx = text.find(needle)
if idx == -1:
    raise SystemExit('needle not found')
old = text[idx-140:idx+180]
print('old snippet length', len(old))
search = '🔁 Reemplazar / Modificar"))))),ve&&d.createElement("div",{style:{marginTop:"12px",padding:"12px",borderRadius:"8px",background:"rgba(2,6,23,0.5)"},'
replace = '🔁 Reemplazar / Modificar")))),d.createElement("button",{onClick:async()=>{if(window.api&&window.api.eliminarFactura&&confirm("¿Eliminar esta factura?")){await window.api.eliminarFactura(r.id);const f=await window.api.obtenerFacturas(D);pt(f||[])}} ,style:{...R.button,...R.buttonDanger,width:"160px",marginTop:0}},"Eliminar")))))),ve&&d.createElement("div",{style:{marginTop:"12px",padding:"12px",borderRadius:"8px",background:"rgba(2,6,23,0.5)"},'
if search not in old:
    raise SystemExit('search snippet not found in old')
new = old.replace(search, replace)
if old == new:
    raise SystemExit('replacement did not change text')
new_text = text.replace(old, new, 1)
if new_text == text:
    raise SystemExit('full replace failed')
p.write_text(new_text, encoding='utf-8')
print('patched')
