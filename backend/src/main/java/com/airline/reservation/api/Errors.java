package com.airline.reservation.api;

import jakarta.persistence.OptimisticLockException;
import org.springframework.dao.*;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class Errors {
  record ErrorBody(String message) {}

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ErrorBody> domain(ApiException e) {
    return ResponseEntity.status(e.status).body(new ErrorBody(e.getMessage()));
  }

  @ExceptionHandler({
    org.springframework.orm.ObjectOptimisticLockingFailureException.class,
    OptimisticLockException.class,
    DataIntegrityViolationException.class
  })
  ResponseEntity<ErrorBody> conflict(Exception e) {
    return ResponseEntity.status(409)
        .body(new ErrorBody("This record changed or the seat was taken. Refresh and try again."));
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    org.springframework.web.method.annotation.HandlerMethodValidationException.class,
    org.springframework.http.converter.HttpMessageNotReadableException.class,
    org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class
  })
  ResponseEntity<ErrorBody> invalid(Exception e) {
    return ResponseEntity.badRequest()
        .body(new ErrorBody("Check the supplied fields and try again."));
  }
}
