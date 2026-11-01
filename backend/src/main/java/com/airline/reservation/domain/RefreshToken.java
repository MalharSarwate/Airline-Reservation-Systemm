package com.airline.reservation.domain;

import jakarta.persistence.*;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "refresh_token")
@Getter
@Setter
public class RefreshToken {
  @Id private String id;
  private Long userId;
  private Instant expiresAt;
  @Version private long version;
}
