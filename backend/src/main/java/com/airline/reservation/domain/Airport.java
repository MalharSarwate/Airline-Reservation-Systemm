package com.airline.reservation.domain;

import jakarta.persistence.*;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "airport")
@Getter
@Setter
public class Airport {
  @Id private String code;
  private String city;
  private String name;
}
