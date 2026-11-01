package com.airline.reservation.domain;

import jakarta.persistence.*;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "booking_seat")
@Getter
@Setter
public class BookingSeat {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long bookingId;
  private Long flightId;
  private String seatNumber;
  private boolean active;
}
