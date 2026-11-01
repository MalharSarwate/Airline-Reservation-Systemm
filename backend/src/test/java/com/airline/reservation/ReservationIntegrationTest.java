package com.airline.reservation;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.*;

@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class ReservationIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired JdbcTemplate jdbc;

  JsonNode register() throws Exception {
    return body(
        mvc.perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        json.writeValueAsString(
                            Map.of(
                                "name",
                                "Integration Traveller",
                                "email",
                                UUID.randomUUID() + "@example.test",
                                "password",
                                "Safe-Test-Pass-123"))))
            .andExpect(status().isOk())
            .andReturn());
  }

  JsonNode body(MvcResult result) throws Exception {
    return json.readTree(result.getResponse().getContentAsString());
  }

  String token(JsonNode u) {
    return u.get("accessToken").asText();
  }

  long flight() {
    Long id =
        jdbc.queryForObject(
            "INSERT INTO"
                + " flight(aircraft_id,airline_id,flight_number,origin,destination,departure,arrival,base_price,status)"
                + " VALUES(1,1,'TEST','BOM','DEL',now()+interval '3 days',now()+interval '3 days 2"
                + " hours',5000,'SCHEDULED') RETURNING id",
            Long.class);
    jdbc.update(
        "INSERT INTO"
            + " flight_seat(flight_id,seat_number,row_number,column_index,cabin,features,surcharge,blocked)"
            + " SELECT ?,seat_number,row_number,column_index,cabin,features,surcharge,blocked FROM"
            + " flight_seat WHERE flight_id=1",
        id);
    return id;
  }

  JsonNode hold(JsonNode u, long f, String seat) throws Exception {
    return body(
        mvc.perform(
                post("/api/seats/hold")
                    .header("Authorization", "Bearer " + token(u))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("flightId", f, "seatNumber", seat))))
            .andExpect(status().isOk())
            .andReturn());
  }

  Map<String, Object> request(long f, String seat, String hold, String outcome) {
    return Map.of(
        "flightId",
        f,
        "requestId",
        UUID.randomUUID().toString(),
        "paymentOutcome",
        outcome,
        "passengers",
        List.of(
            Map.of(
                "name",
                "Test Traveller",
                "dateOfBirth",
                "1995-05-12",
                "seatNumber",
                seat,
                "holdId",
                hold,
                "baggage",
                "BAG_NONE",
                "meal",
                "MEAL_NONE")));
  }

  @Test
  void authRefreshRotationValidationAndAuthorization() throws Exception {
    mvc.perform(get("/actuator/health/readiness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"));
    mvc.perform(get("/api/bookings/me")).andExpect(status().isUnauthorized());
    var u = register();
    mvc.perform(get("/api/admin/bookings").header("Authorization", "Bearer " + token(u)))
        .andExpect(status().isForbidden());
    var refresh = Map.of("refreshToken", u.get("refreshToken").asText());
    mvc.perform(
            post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(refresh)))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(refresh)))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsString(
                        Map.of("email", u.get("user").get("email").asText(), "password", "wrong"))))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void fullBookingIdempotencyPrivacyPdfAndCancellation() throws Exception {
    var u = register();
    var other = register();
    long f = flight();
    var h = hold(u, f, "7A");
    var req = request(f, "7A", h.get("id").asText(), "APPROVE");
    String payload = json.writeValueAsString(req);
    var b =
        body(
            mvc.perform(
                    post("/api/bookings")
                        .header("Authorization", "Bearer " + token(u))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andReturn());
    mvc.perform(
            post("/api/bookings")
                .header("Authorization", "Bearer " + token(u))
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(b.get("id").asLong()));
    mvc.perform(
            get("/api/bookings/" + b.get("id") + "/ticket")
                .header("Authorization", "Bearer " + token(other)))
        .andExpect(status().isNotFound());
    var pdf =
        mvc.perform(
                get("/api/bookings/" + b.get("id") + "/ticket")
                    .header("Authorization", "Bearer " + token(u)))
            .andExpect(status().isOk())
            .andExpect(content().contentType("application/pdf"))
            .andReturn()
            .getResponse()
            .getContentAsByteArray();
    assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    mvc.perform(
            post("/api/bookings/" + b.get("id") + "/cancel")
                .header("Authorization", "Bearer " + token(u)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CANCELLED"));
    hold(other, f, "7A");
  }

  @Test
  void competingHoldsAllowExactlyOneWinner() throws Exception {
    var a = register();
    var b = register();
    long f = flight();
    var start = new CountDownLatch(1);
    try (var pool = Executors.newFixedThreadPool(2)) {
      List<Future<Integer>> results = new ArrayList<>();
      for (var u : List.of(a, b))
        results.add(
            pool.submit(
                () -> {
                  start.await();
                  return mvc.perform(
                          post("/api/seats/hold")
                              .header("Authorization", "Bearer " + token(u))
                              .contentType(MediaType.APPLICATION_JSON)
                              .content(
                                  json.writeValueAsString(
                                      Map.of("flightId", f, "seatNumber", "8B"))))
                      .andReturn()
                      .getResponse()
                      .getStatus();
                }));
      start.countDown();
      assertThat(List.of(results.get(0).get(), results.get(1).get()))
          .containsExactlyInAnyOrder(200, 409);
    }
  }

  @Test
  void expiredHoldAndDeclinedPaymentNeverCreateBookings() throws Exception {
    var u = register();
    long f = flight();
    var h = hold(u, f, "9C");
    var req = request(f, "9C", h.get("id").asText(), "DECLINE");
    mvc.perform(
            post("/api/bookings")
                .header("Authorization", "Bearer " + token(u))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(req)))
        .andExpect(status().isPaymentRequired());
    jdbc.update(
        "UPDATE flight_seat SET hold_expires_at = now()-interval '1 minute', version=version+1"
            + " WHERE hold_id=?",
        h.get("id").asText());
    mvc.perform(
            post("/api/bookings")
                .header("Authorization", "Bearer " + token(u))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsString(request(f, "9C", h.get("id").asText(), "APPROVE"))))
        .andExpect(status().isConflict());
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM booking WHERE user_id=?",
                Integer.class,
                u.get("user").get("id").asLong()))
        .isZero();
    hold(register(), f, "9C");
  }

  @Test
  void searchValidationAndSeatPrivacy() throws Exception {
    mvc.perform(
            get("/api/flights/search")
                .param("date", LocalDate.now().toString())
                .param("passengers", "9"))
        .andExpect(status().isBadRequest());
    var u = register();
    long f = flight();
    hold(u, f, "6F");
    var map =
        body(
            mvc.perform(get("/api/flights/" + f + "/seatmap"))
                .andExpect(status().isOk())
                .andReturn());
    for (var s : map.get("seats"))
      if (s.get("number").asText().equals("6F")) {
        assertThat(s.get("status").asText()).isEqualTo("HELD");
        assertThat(s.get("holdId").isNull()).isTrue();
      }
  }

  @Test
  void concurrentCheckoutCannotSellTheSameSeatTwice() throws Exception {
    var u = register();
    long f = flight();
    var h = hold(u, f, "12D");
    var start = new CountDownLatch(1);
    try (var pool = Executors.newFixedThreadPool(2)) {
      List<Future<Integer>> results = new ArrayList<>();
      for (int i = 0; i < 2; i++)
        results.add(
            pool.submit(
                () -> {
                  String payload =
                      json.writeValueAsString(request(f, "12D", h.get("id").asText(), "APPROVE"));
                  start.await();
                  return mvc.perform(
                          post("/api/bookings")
                              .header("Authorization", "Bearer " + token(u))
                              .contentType(MediaType.APPLICATION_JSON)
                              .content(payload))
                      .andReturn()
                      .getResponse()
                      .getStatus();
                }));
      start.countDown();
      assertThat(List.of(results.get(0).get(), results.get(1).get()))
          .containsExactlyInAnyOrder(200, 409);
      assertThat(
              jdbc.queryForObject(
                  "SELECT count(*) FROM booking_seat WHERE flight_id=? AND seat_number='12D' AND"
                      + " active",
                  Integer.class,
                  f))
          .isEqualTo(1);
    }
  }

  @Test
  void adminCanCreateLayoutsAndUpdateUnreservedSeats() throws Exception {
    var u = register();
    jdbc.update("UPDATE app_user SET role='ADMIN' WHERE id=?", u.get("user").get("id").asLong());
    var admin =
        body(
            mvc.perform(
                    post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            json.writeValueAsString(
                                Map.of(
                                    "email",
                                    u.get("user").get("email").asText(),
                                    "password",
                                    "Safe-Test-Pass-123"))))
                .andExpect(status().isOk())
                .andReturn());
    mvc.perform(
            post("/api/admin/aircraft")
                .header("Authorization", "Bearer " + token(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"Test Widebody\",\"layout\":\"2-4-2\",\"rows\":24}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.columnsCount").value(8));
    long f = flight();
    mvc.perform(
            patch("/api/admin/flights/" + f + "/seats/6A")
                .header("Authorization", "Bearer " + token(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"blocked\":true,\"surcharge\":250}"))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/seats/hold")
                .header("Authorization", "Bearer " + token(u))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("flightId", f, "seatNumber", "6A"))))
        .andExpect(status().isConflict());
  }
  @Test void groupHoldsAreAtomicAndPreservePreviousHoldsOnConflict() throws Exception {
    var user=register();var other=register();long f=flight();var original=hold(user,f,"6A");hold(other,f,"7B");
    var rejected=Map.of("flightId",f,"seatNumbers",List.of("6C","7B"),"releaseHoldIds",List.of(original.get("id").asText()));
    mvc.perform(post("/api/seats/hold/group").header("Authorization","Bearer "+token(user)).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(rejected))).andExpect(status().isConflict());
    assertThat(jdbc.queryForObject("SELECT hold_id FROM flight_seat WHERE flight_id=? AND seat_number='6A'",String.class,f)).isEqualTo(original.get("id").asText());
    assertThat(jdbc.queryForObject("SELECT hold_id FROM flight_seat WHERE flight_id=? AND seat_number='6C'",String.class,f)).isNull();
    var accepted=Map.of("flightId",f,"seatNumbers",List.of("6B","6C"),"releaseHoldIds",List.of(original.get("id").asText()));
    mvc.perform(post("/api/seats/hold/group").header("Authorization","Bearer "+token(user)).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(accepted))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
    assertThat(jdbc.queryForObject("SELECT hold_id FROM flight_seat WHERE flight_id=? AND seat_number='6A'",String.class,f)).isNull();
  }
}
