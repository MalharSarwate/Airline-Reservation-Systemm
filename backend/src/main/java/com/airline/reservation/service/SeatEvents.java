package com.airline.reservation.service;

import java.util.*;
import java.util.concurrent.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class SeatEvents {
  private final ConcurrentMap<Long, CopyOnWriteArrayList<SseEmitter>> streams =
      new ConcurrentHashMap<>();

  public SseEmitter subscribe(Long id) {
    SseEmitter e = new SseEmitter(120000L);
    var list = streams.computeIfAbsent(id, k -> new CopyOnWriteArrayList<>());
    list.add(e);
    Runnable remove =
        () -> {
          list.remove(e);
          if (list.isEmpty()) streams.remove(id, list);
        };
    e.onCompletion(remove);
    e.onTimeout(
        () -> {
          remove.run();
          e.complete();
        });
    e.onError(x -> remove.run());
    send(e);
    return e;
  }

  private void send(SseEmitter e) {
    try {
      e.send(SseEmitter.event().name("seats").data("refresh"));
    } catch (Exception ex) {
      e.complete();
    }
  }

  public void changed(Long id) {
    if (TransactionSynchronizationManager.isSynchronizationActive())
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              broadcast(id);
            }
          });
    else broadcast(id);
  }

  private void broadcast(Long id) {
    streams.getOrDefault(id, new CopyOnWriteArrayList<>()).forEach(this::send);
  }
}
