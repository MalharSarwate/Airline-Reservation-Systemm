package com.airline.reservation.domain;

import jakarta.persistence.*;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "airline")
@Getter
@Setter
public class Airline {
  @Id private Long id;
  private String name;
  private String code;
}
