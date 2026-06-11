-- Lanzador de Diagramas Unilineales
-- Abre Terminal, ejecuta npm run dev y abre el navegador.

set proyecto to "/Users/mac/Projects/diagramas-uniliniales"

tell application "Terminal"
	activate
	do script "cd " & quoted form of proyecto & " && clear && echo '==============================================' && echo '  Diagramas Unilineales — arrancando…' && echo '==============================================' && echo '' && if [ ! -d node_modules ]; then echo '→ Primera vez: instalando dependencias…'; npm install; fi && ( sleep 5 && open 'http://localhost:5173' ) & npm run dev"
end tell
