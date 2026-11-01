package com.airline.reservation.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "flight_seat")
@Getter
@Setter
public class FlightSeat {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long flightId;
  private String seatNumber;
  private int rowNumber;
  private int columnIndex;
  private String cabin;
  private String features;
  private BigDecimal surcharge;
  private boolean blocked;
  private String holdId;
  private Long holdUserId;
  private Instant holdExpiresAt;
  private Long bookingId;
  @Version private long version;
}
