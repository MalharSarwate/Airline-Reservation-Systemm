package com.airline.reservation.domain;

import jakarta.persistence.*;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "seat_hold")
@Getter
@Setter
public class SeatHold {
  @Id private String id;
  private Long userId;
  private Long flightId;
  private Long seatId;
  private Instant expiresAt;
}
