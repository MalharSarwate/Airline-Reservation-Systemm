package com.airline.reservation.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "flight")
@Getter
@Setter
public class Flight {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long aircraftId;
  private Long airlineId;
  private String flightNumber;
  private String origin;
  private String destination;
  private Instant departure;
  private Instant arrival;
  private BigDecimal basePrice;
  private String status;
  @Version private long version;
}
