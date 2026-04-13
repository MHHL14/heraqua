<?php
declare(strict_types=1);

// Only register if running in Magento context (not in unit test environment)
if (class_exists('Magento\Framework\Component\ComponentRegistrar')) {
    \Magento\Framework\Component\ComponentRegistrar::register(
        \Magento\Framework\Component\ComponentRegistrar::MODULE,
        'Herqua_Schoenadviseur',
        __DIR__
    );
}
