package com.neogeo.tracking.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenAPIConfig {
    
    @Bean
    public OpenAPI myOpenAPI() {
        Server devServer = new Server();
        devServer.setUrl("http://localhost:6060");
        devServer.setDescription("Development server");

        Contact contact = new Contact();
        contact.setEmail("support@neogeo.com");
        contact.setName("NeoGeo Support");

        Info info = new Info()
            .title("Surveyor Tracking API")
            .version("1.0")
            .contact(contact)
            .description("This API exposes endpoints to manage surveyors and track their locations.");

        return new OpenAPI()
            .info(info)
            .servers(List.of(devServer));
    }
}
