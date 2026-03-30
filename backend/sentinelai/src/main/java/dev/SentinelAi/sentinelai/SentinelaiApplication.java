package dev.SentinelAi.sentinelai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableRetry
public class SentinelaiApplication {

	public static void main(String[] args) {
		SpringApplication.run(SentinelaiApplication.class, args);
	}

}
