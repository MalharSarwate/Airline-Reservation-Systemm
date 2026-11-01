package com.airline.reservation.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "booking")
@Getter
@Setter
public class Booking {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long userId;
  private Long flightId;

  @Column(unique = true)
  private String pnr;

  private String status;
  private BigDecimal total;
  private Instant createdAt;

  @Column(unique = true)
  private String requestId;
}
