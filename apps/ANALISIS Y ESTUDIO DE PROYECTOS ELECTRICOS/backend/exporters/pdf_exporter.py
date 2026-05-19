"""
Exportador PDF profesional con reportlab.
Genera informe técnico con portada, resumen ejecutivo, cubicación,
presupuesto, matriz normativa, riesgos.
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    Image,
)
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from datetime import datetime


COLOR_PRIMARY = colors.HexColor("#0F2C4A")
COLOR_HEAD = colors.HexColor("#E8EDF3")
COLOR_BORDER = colors.HexColor("#D6DCE5")


def _estilos():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle("H1Cust", parent=base["Title"], textColor=COLOR_PRIMARY, fontSize=18))
    base.add(ParagraphStyle("H2Cust", parent=base["Heading2"], textColor=COLOR_PRIMARY, fontSize=13))
    base.add(ParagraphStyle("Body", parent=base["BodyText"], fontSize=9, leading=12))
    base.add(ParagraphStyle("Meta", parent=base["BodyText"], fontSize=8, textColor=colors.grey, alignment=TA_CENTER))
    return base


def _tabla_estilo():
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 7),
        ("FONTSIZE", (0, 1), (-1, -1), 7),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ])


def exportar_pdf(
    proyecto: dict,
    cubicacion: list[dict],
    normativa: list[dict],
    riesgos: list[dict],
    config: dict,
    especificaciones: list[dict] | None = None,
    output_path: Path | None = None,
) -> Path:
    if output_path is None:
        raise ValueError("output_path requerido")

    estilos = _estilos()
    elementos: list = []
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title=f"Informe técnico - {proyecto.get('nombre','')}",
    )

    # ===== Portada =====
    elementos.append(Paragraph("INFORME TÉCNICO ELÉCTRICO", estilos["H1Cust"]))
    elementos.append(Paragraph(proyecto.get("nombre", "—"), estilos["H2Cust"]))
    elementos.append(Spacer(1, 0.4 * cm))
    elementos.append(Paragraph(
        f"Mandante: <b>{proyecto.get('mandante','—')}</b><br/>"
        f"Ubicación: {proyecto.get('ubicacion','—')}<br/>"
        f"Tipo: {proyecto.get('tipo','—')} · "
        f"Tensión: {proyecto.get('tension','—')} V · "
        f"Potencia: {proyecto.get('potencia','—')} kW<br/>"
        f"Ambiente: {proyecto.get('ambiente','—')} · "
        f"Método de instalación: {proyecto.get('metodo_instalacion','—')}",
        estilos["Body"],
    ))
    elementos.append(Spacer(1, 0.4 * cm))
    elementos.append(Paragraph(
        f"<i>Documento generado automáticamente · {datetime.utcnow().strftime('%d-%m-%Y %H:%M UTC')}</i>",
        estilos["Meta"],
    ))
    elementos.append(Spacer(1, 0.6 * cm))

    # ===== Cubicación =====
    elementos.append(Paragraph("1. Cubicación de materiales", estilos["H2Cust"]))
    elementos.append(Spacer(1, 0.2 * cm))

    cab = ["#", "Partida", "Descripción", "Un", "Cant.", "PU", "Total", "Fuente", "Conf."]
    data = [cab]
    total = 0
    for i, it in enumerate(cubicacion, start=1):
        cant = it.get("cantidad", 0) or 0
        factor = it.get("factor_perdida", 0) or 0
        pu = it.get("precio_unitario", 0) or 0
        cf = cant * (1 + factor / 100)
        t = cf * pu
        total += t
        data.append([
            str(i),
            (it.get("partida") or "")[:14],
            (it.get("descripcion") or "")[:48],
            it.get("unidad") or "",
            f"{cf:,.1f}",
            f"{pu:,.0f}",
            f"{t:,.0f}",
            (it.get("fuente") or "")[:8],
            (it.get("confianza") or "")[:5],
        ])
    data.append(["", "", "", "", "", "TOTAL", f"{total:,.0f}", "", ""])
    t = Table(data, colWidths=[0.8*cm, 2.2*cm, 6*cm, 1*cm, 1.4*cm, 1.6*cm, 1.8*cm, 1.5*cm, 1.2*cm], repeatRows=1)
    t.setStyle(_tabla_estilo())
    elementos.append(t)
    elementos.append(PageBreak())

    # ===== Matriz normativa =====
    elementos.append(Paragraph("2. Matriz de cumplimiento normativo", estilos["H2Cust"]))
    elementos.append(Paragraph(
        "<i>Nota: las referencias a RIC SEC son genéricas cuando no se dispone del documento normativo "
        "cargado al proyecto. Validar artículos específicos contra la versión vigente.</i>",
        estilos["Body"],
    ))
    elementos.append(Spacer(1, 0.3 * cm))
    data_n = [["#", "Requisito", "Norma / Ref.", "Estado", "Evidencia / Obs."]]
    for i, n in enumerate(normativa, start=1):
        data_n.append([
            str(i),
            (n.get("requisito") or "")[:55],
            (n.get("norma_ref") or "")[:25],
            (n.get("estado") or "")[:18],
            ((n.get("evidencia") or "") + " " + (n.get("observacion") or ""))[:50],
        ])
    tn = Table(data_n, colWidths=[0.8*cm, 6.5*cm, 3.5*cm, 2.5*cm, 4.5*cm], repeatRows=1)
    tn.setStyle(_tabla_estilo())
    elementos.append(tn)
    elementos.append(PageBreak())

    # ===== Riesgos =====
    elementos.append(Paragraph("3. Matriz de riesgos y observaciones", estilos["H2Cust"]))
    elementos.append(Spacer(1, 0.3 * cm))
    data_r = [["#", "Cat.", "Descripción", "Prob.", "Imp.", "Nivel", "Mitigación"]]
    for i, r in enumerate(riesgos, start=1):
        data_r.append([
            str(i),
            (r.get("categoria") or "")[:12],
            (r.get("descripcion") or "")[:45],
            (r.get("probabilidad") or "")[:8],
            (r.get("impacto") or "")[:8],
            (r.get("nivel") or "")[:10],
            (r.get("mitigacion") or "")[:40],
        ])
    tr = Table(data_r, colWidths=[0.8*cm, 2*cm, 5.8*cm, 1.4*cm, 1.4*cm, 1.6*cm, 5*cm], repeatRows=1)
    tr.setStyle(_tabla_estilo())
    elementos.append(tr)

    # ===== Especificaciones (si vienen) =====
    if especificaciones:
        elementos.append(PageBreak())
        elementos.append(Paragraph("4. Especificaciones técnicas", estilos["H2Cust"]))
        elementos.append(Spacer(1, 0.3 * cm))
        for e in especificaciones:
            elementos.append(Paragraph(f"<b>{e.get('partida','')}</b>", estilos["Body"]))
            # Convertir saltos de línea
            contenido = (e.get("contenido_md") or "").replace("\n", "<br/>")
            elementos.append(Paragraph(contenido[:5000], estilos["Body"]))
            elementos.append(Spacer(1, 0.4 * cm))

    doc.build(elementos)
    return output_path
