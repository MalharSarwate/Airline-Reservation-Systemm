package com.airline.reservation.api;
import com.airline.reservation.service.AmadeusService;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
@RestController @RequestMapping("/api/flights/provider") @RequiredArgsConstructor
public class ProviderController {
 private final AmadeusService provider;
 @GetMapping("/status") AmadeusService.Status status(){return provider.status();}
 @GetMapping("/search") AmadeusService.Result search(@RequestParam String origin,@RequestParam String destination,@RequestParam LocalDate date,@RequestParam(defaultValue="1") int passengers,@RequestParam(defaultValue="ECONOMY") String cabin){return provider.search(origin,destination,date,passengers,cabin);}
}
