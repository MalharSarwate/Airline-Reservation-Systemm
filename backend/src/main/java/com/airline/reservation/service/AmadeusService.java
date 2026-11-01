package com.airline.reservation.service;
import com.airline.reservation.api.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestClient;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import java.time.*;
import java.util.*;
@Service
public class AmadeusService {
 private final String key,secret,environment;
 private final RestClient client;
 private String token; private Instant expires=Instant.EPOCH;
 public AmadeusService(@Value("${amadeus.client-id:}") String key,@Value("${amadeus.client-secret:}") String secret,@Value("${amadeus.environment:test}") String environment){
 this.key=key;this.secret=secret;this.environment=environment;
 if(!List.of("test","production").contains(environment))throw new IllegalArgumentException("Invalid Amadeus environment");
 var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(10000);factory.setReadTimeout(20000);
 client=RestClient.builder().requestFactory(factory).baseUrl(environment.equals("production")?"https://api.amadeus.com":"https://test.api.amadeus.com").build();
 }
 public record Status(boolean configured,String environment,String source){}
 public Status status(){return new Status(!key.isBlank()&&!secret.isBlank(),environment,"Amadeus");}
 private synchronized String token(){
 if(token!=null&&expires.isAfter(Instant.now()))return token;
 var form=new LinkedMultiValueMap<String,String>();form.add("grant_type","client_credentials");form.add("client_id",key);form.add("client_secret",secret);
 JsonNode result=client.post().uri("/v1/security/oauth2/token").contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(JsonNode.class);
 if(result==null||!result.hasNonNull("access_token"))throw new IllegalStateException();
 token=result.get("access_token").asText();expires=Instant.now().plusSeconds(Math.max(1,result.path("expires_in").asLong(300)-60));return token;
 }
 public record Segment(String flight,String origin,String destination,String departure,String arrival){}
 public record Offer(String id,String total,String currency,List<Segment> segments){}
 public record Result(String source,String environment,Instant retrievedAt,int adults,List<Offer> offers){}
 public Result search(String origin,String destination,LocalDate date,int adults,String cabin){
 if(!origin.matches("[A-Z]{3}")||!destination.matches("[A-Z]{3}")||origin.equals(destination)||date.isBefore(LocalDate.now(ZoneOffset.UTC))||adults<1||adults>6||!List.of("ECONOMY","PREMIUM","BUSINESS","FIRST").contains(cabin))throw ApiException.bad("Check route, date, cabin and adult traveller count");
 if(!status().configured())throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"Amadeus credentials are not configured. Demo search remains available.");
 try {
 String access=token();JsonNode data=client.get().uri(b->b.path("/v2/shopping/flight-offers").queryParam("originLocationCode",origin).queryParam("destinationLocationCode",destination).queryParam("departureDate",date).queryParam("adults",adults).queryParam("travelClass",cabin.equals("PREMIUM")?"PREMIUM_ECONOMY":cabin).queryParam("currencyCode","INR").queryParam("max",12).build()).header(HttpHeaders.AUTHORIZATION,"Bearer "+access).retrieve().body(JsonNode.class);
 List<Offer> offers=new ArrayList<>();if(data==null||!data.path("data").isArray())throw new IllegalStateException();
 for(JsonNode offer:data.path("data")){List<Segment> segments=new ArrayList<>();for(JsonNode itinerary:offer.path("itineraries"))for(JsonNode s:itinerary.path("segments"))segments.add(new Segment(s.path("carrierCode").asText()+s.path("number").asText(),s.path("departure").path("iataCode").asText(),s.path("arrival").path("iataCode").asText(),s.path("departure").path("at").asText(),s.path("arrival").path("at").asText()));offers.add(new Offer(offer.path("id").asText(),offer.path("price").path("grandTotal").asText(offer.path("price").path("total").asText()),offer.path("price").path("currency").asText(),segments));}
 return new Result("Amadeus",environment,Instant.now(),adults,offers);
 }catch(org.springframework.web.client.HttpClientErrorException.Unauthorized e){synchronized(this){token=null;}throw new ApiException(HttpStatus.BAD_GATEWAY,"Amadeus rejected authentication. Check the configured credentials and environment.");}
 catch(Exception e){throw new ApiException(HttpStatus.BAD_GATEWAY,"Amadeus search is unavailable or the request quota was reached. Please try later.");}
 }
}
