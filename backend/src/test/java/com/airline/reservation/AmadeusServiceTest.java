package com.airline.reservation;
import com.airline.reservation.service.AmadeusService;
import com.airline.reservation.api.ApiException;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.*;
class AmadeusServiceTest {
 @Test void missingCredentialsNeverCallProvider(){var s=new AmadeusService("","","test");assertThat(s.status().configured()).isFalse();assertThatThrownBy(()->s.search("BOM","DEL",LocalDate.now().plusDays(1),1,"ECONOMY")).isInstanceOf(ApiException.class).hasMessageContaining("not configured");}
 @Test void unknownEnvironmentIsRejected(){assertThatThrownBy(()->new AmadeusService("","","unknown")).isInstanceOf(IllegalArgumentException.class);}
 @Test void invalidPassengerCountIsRejected(){var s=new AmadeusService("","","test");assertThatThrownBy(()->s.search("BOM","DEL",LocalDate.now().plusDays(1),0,"ECONOMY")).isInstanceOf(ApiException.class).hasMessageContaining("adult traveller count");}
}
