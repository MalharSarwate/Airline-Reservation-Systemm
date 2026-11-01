package com.airline.reservation.domain;

import jakarta.persistence.*;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "passenger")
@Getter
@Setter
public class Passenger {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long bookingId;
  private String name;
  private LocalDate dateOfBirth;
  private String seatNumber;
  private String baggage;
  private String meal;
}
