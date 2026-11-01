package com.airline.reservation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@org.springframework.scheduling.annotation.EnableScheduling
@SpringBootApplication
public class ReservationApplication {
  public static void main(String[] args) {
    SpringApplication.run(ReservationApplication.class, args);
  }
}
