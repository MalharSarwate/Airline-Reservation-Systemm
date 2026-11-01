package com.airline.reservation.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "fare_class")
@Getter
@Setter
public class FareClass {
  @Id private String code;
  private BigDecimal multiplier;
  private String baggage;
}
