package com.neogeo.config;

import java.io.IOException;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class HttpHeadersFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // Set protocol version explicitly
        httpResponse.setStatus(HttpServletResponse.SC_OK);
        httpResponse.setHeader("Content-Type", "application/json; charset=utf-8");
        
        // Set date header
        httpResponse.setDateHeader("Date", System.currentTimeMillis());
        
        // Continue with the request
        chain.doFilter(request, response);
    }
}
