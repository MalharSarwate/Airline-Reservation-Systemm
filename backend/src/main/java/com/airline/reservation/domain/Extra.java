package com.airline.reservation.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "extra")
@Getter
@Setter
public class Extra {
  @Id private String code;
  private String name;
  private String kind;
  private BigDecimal price;
}
