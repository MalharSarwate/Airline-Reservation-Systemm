package com.airline.reservation.service;

import com.airline.reservation.api.Dto;
import java.io.*;
import java.util.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.*;
import org.springframework.stereotype.Service;

@Service
public class TicketService {
  public byte[] pdf(Dto.BookingView b) {
    try (PDDocument doc = new PDDocument();
        ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      PDPage page = new PDPage();
      doc.addPage(page);
      try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
        cs.beginText();
        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
        cs.setLeading(23);
        cs.newLineAtOffset(48, 740);
        List<String> lines =
            new ArrayList<>(
                List.of(
                    "AEROLINE | E-TICKET (DEMO)",
                    "PNR: " + b.pnr() + " | " + b.status(),
                    b.flight().flightNumber()
                        + " | "
                        + b.flight().origin()
                        + " to "
                        + b.flight().destination(),
                    "Departure (UTC): " + b.flight().departure(),
                    "Arrival (UTC): " + b.flight().arrival(),
                    "Total: INR " + b.total(),
                    "Payment: mock / no money charged",
                    "Passengers:"));
        for (var p : b.passengers())
          lines.add(
              p.name() + " | Seat " + p.seatNumber() + " | " + p.baggage() + " / " + p.meal());
        lines.add("Demo reservation only. Not valid for travel.");
        for (String line : lines) {
          cs.showText(line.replaceAll("[^ -~]", "?"));
          cs.newLine();
        }
        cs.endText();
      }
      doc.save(output);
      return output.toByteArray();
    } catch (IOException e) {
      throw new IllegalStateException("Ticket could not be generated", e);
    }
  }
}
