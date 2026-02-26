import { supabase } from "@/lib/supabase"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

// Simple formatted date (February 25, 2025)

function formatDate(date: string) {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Full date in sentence format (25th day of February, 2025)
function formatFullDateParts(dateString: string) {
  if (!dateString) return { sentence: "" }

  const date = new Date(dateString)

  const day = date.getDate()
  const year = date.getFullYear()
  const month = date.toLocaleString("en-US", { month: "long" })

  const getOrdinal = (n: number) => {
    if (n > 3 && n < 21) return n + "th"
    switch (n % 10) {
      case 1: return n + "st"
      case 2: return n + "nd"
      case 3: return n + "rd"
      default: return n + "th"
    }
  }

  const sentence = `${getOrdinal(day)} day        ${month}        ${year}`

  return { sentence }
}


export async function generateCavPDF(form: any) {
  
  let prepareName = ""
  let preparePosition = ""
  let submitName = ""
  let submitPosition = ""

    if (form.prepared_by) {
      const { data: prepData} = await supabase
        .from("signatories")
        .select("full_name, position")
        .eq("id", form.prepared_by)
        .single()
      if (prepData) {
        prepareName = prepData.full_name.toUpperCase()
        preparePosition = prepData.position
      }
    }

    if (form.submitted_by) {
    const { data: subData } = await supabase
      .from("signatories")
      .select("full_name, position")
      .eq("id", form.submitted_by)
      .single()
    if (subData) {
      submitName = subData.full_name.toUpperCase()
      submitPosition = subData.position
    }
  }
  
  const existingPdfBytes = await fetch("/CAV_Format.pdf")
    .then(res => res.arrayBuffer())

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const pages = pdfDoc.getPages()
  
  const Boldfont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const name = (form.full_legal_name ?? "").toUpperCase()
  const { sentence } = formatFullDateParts(form.date_issued)

    let fontSize = 11
    const maxWidth = 120
    let textWidth = Boldfont.widthOfTextAtSize(name, fontSize)
      while (textWidth > maxWidth && fontSize > 9) {
        fontSize -= 0.5
        textWidth = Boldfont.widthOfTextAtSize(name, fontSize)
      }

  const firstPage = pages[0]

  firstPage.drawText(name, {
    x: 340,
    y: 645,
    size: fontSize,
    font: Boldfont,
    color: rgb(0, 0, 0),
  })

  firstPage.drawText(name, {
    x: 120,
    y: 493,
    size: fontSize,
    font: Boldfont,
    color: rgb(0, 0, 0),
  })

  firstPage.drawText(sentence, {
    x: 291,
    y: 505,
    size: 10,
    font: Boldfont,
  })

  if (prepareName) {
    firstPage.drawText(prepareName, {
      x: 120,
      y: 450,
      size: fontSize,
      font: Boldfont,
      color: rgb(0, 0, 0),
    })
  }

  if (preparePosition) {
    firstPage.drawText(preparePosition, {
      x: 120,
      y: 435,
      size: 10,
      font: Boldfont,
      color: rgb(0, 0, 0),
    })
  }

  if (submitName) {
    firstPage.drawText(submitName, {
      x: 350,
      y: 450,
      size: fontSize,
      font: Boldfont,
      color: rgb(0, 0, 0),
    })
  }

  if (submitPosition) {
    firstPage.drawText(submitPosition, {
      x: 350, 
      y: 435,
      size: 10,
      font: Boldfont,
      color: rgb(0, 0, 0),
    })
  }


  const secondPage = pages[1]
  secondPage.drawText(name, {
    x: 137,
    y: 689,
    size: fontSize,
    font: Boldfont,
    color: rgb(0, 0, 0),
  })

  secondPage.drawText(formatDate(form.date_of_application), {
    x: 257,
    y: 758,
    size: 12,
    font: Boldfont,
  })

  const thirdPage = pages[2]
  thirdPage.drawText(form.control_no ?? "", {
    x: 100,
    y: 697,
    size: 10,
    font,
  })

  thirdPage.drawText(name, {
    x: 180,
    y: 697,
    size: fontSize,
    font: Boldfont,
    color: rgb(0, 0, 0),
  })

  thirdPage.drawText(formatDate(form.date_of_application), {
    x: 325,
    y: 697,
    size: 12,
    font,
  })

  thirdPage.drawText(formatDate(form.date_of_transmission), {
    x: 450,
    y: 697,
    size: 12,
    font,
  })


  const fourthPage = pages[3]
  fourthPage.drawText(name, {
    x: 285,
    y: 675,
    size: fontSize,
    font: Boldfont,
    color: rgb(0, 0, 0),
  })

  fourthPage.drawText(form.school_name ?? "", {
    x: 270,
    y: 605,
    size: fontSize,
    font: Boldfont,
  })

  fourthPage.drawText(form.school_address ?? "", {
    x: 270,
    y: 590,
    size: fontSize,
    font: Boldfont,
  })

  fourthPage.drawText(form.school_year_completed ?? "", {
    x: 270,
    y: 570,
    size: 12,
    font: Boldfont,
  })

  fourthPage.drawText(formatDate(form.school_year_graduated), {
    x: 270,
    y: 555,
    size: 12,
    font: Boldfont,
  })

  fourthPage.drawText(sentence, {
    x: 291,
    y: 450,
    size: 10,
    font: Boldfont,
  })


  
  const pdfBytes: Uint8Array = await pdfDoc.save()

  const blob = new Blob([pdfBytes as any], {
    type: "application/pdf",
  })

  const url = URL.createObjectURL(blob)
  window.open(url, "_blank")
}
