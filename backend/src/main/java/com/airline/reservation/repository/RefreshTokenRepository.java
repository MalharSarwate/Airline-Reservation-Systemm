package com.airline.reservation.repository;

import com.airline.reservation.domain.RefreshToken;
import org.springframework.data.jpa.repository.*;

public interface RefreshTokenRepository
    extends JpaRepository<RefreshToken, String>, JpaSpecificationExecutor<RefreshToken> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query("select t from RefreshToken t where t.id = :id")
  java.util.Optional<RefreshToken> locked(String id);

  void deleteByUserId(Long userId);
}
